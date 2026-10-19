import { mkdtemp, writeFile, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { createPrivateKey, X509Certificate, createHash } from 'crypto';
import { Signer } from '@signpdf/utils';
const execute = promisify(execFile);
async function openssl(args: string[], passphrase = '') {
  return execute('openssl', args, {
    timeout: 15000,
    maxBuffer: 2 * 1024 * 1024,
    env: { ...process.env, SCHOOLOS_SIGNER_PASSWORD: passphrase },
  });
}
export async function nativeSigningIdentity(bytes: Buffer, passphrase: string) {
  const dir = await mkdtemp(join(tmpdir(), 'schoolos-signer-'));
  try {
    const p12 = join(dir, 'identity.p12');
    await writeFile(p12, bytes, { mode: 0o600 });
    const { stdout } = await openssl(
      ['pkcs12', '-in', p12, '-nodes', '-passin', 'env:SCHOOLOS_SIGNER_PASSWORD'],
      passphrase,
    );
    const keyPem = stdout.match(/-----BEGIN (?:RSA )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA )?PRIVATE KEY-----/)?.[0];
    if (!keyPem) throw Error('Missing key');
    const key = createPrivateKey(keyPem);
    if (key.asymmetricKeyType !== 'rsa') throw Error('RSA signer required');
    const certs = [...stdout.matchAll(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g)].map(
      (m) => m[0],
    );
    const certPem = certs.find((pem) => new X509Certificate(pem).checkPrivateKey(key));
    if (!certPem) throw Error('Key does not match certificate');
    const cert = new X509Certificate(certPem),
      now = Date.now();
    if (Date.parse(cert.validFrom) > now || Date.parse(cert.validTo) < now) throw Error('Invalid validity');
    const certPath = join(dir, 'certificate.pem');
    await writeFile(certPath, certPem, { mode: 0o600 });
    const usage = await openssl(['x509', '-in', certPath, '-noout', '-ext', 'keyUsage']);
    if (usage.stdout.includes('X509v3 Key Usage') && !usage.stdout.includes('Digital Signature'))
      throw Error('Invalid key usage');
    return {
      keyPem,
      certPem,
      chainPem: certs.filter((p) => p !== certPem).join('\n'),
      fingerprint: createHash('sha256').update(cert.raw).digest('hex'),
      name: cert.subject.match(/(?:^|\n)CN=([^\n]+)/)?.[1] || 'School authorized signer',
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
export class NativePdfSigner extends Signer {
  constructor(private readonly identity: Awaited<ReturnType<typeof nativeSigningIdentity>>) {
    super();
  }
  async sign(pdfBuffer: Buffer): Promise<Buffer> {
    const dir = await mkdtemp(join(tmpdir(), 'schoolos-cms-'));
    try {
      const input = join(dir, 'content.bin'),
        key = join(dir, 'key.pem'),
        cert = join(dir, 'cert.pem'),
        output = join(dir, 'signature.der');
      await Promise.all([
        writeFile(input, pdfBuffer, { mode: 0o600 }),
        writeFile(key, this.identity.keyPem, { mode: 0o600 }),
        writeFile(cert, this.identity.certPem, { mode: 0o600 }),
      ]);
      const args = [
        'cms',
        '-sign',
        '-binary',
        '-in',
        input,
        '-signer',
        cert,
        '-inkey',
        key,
        '-outform',
        'DER',
        '-md',
        'sha256',
        '-out',
        output,
      ];
      if (this.identity.chainPem) {
        const chain = join(dir, 'chain.pem');
        await writeFile(chain, this.identity.chainPem, { mode: 0o600 });
        args.push('-certfile', chain);
      }
      await openssl(args);
      return await readFile(output);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }
}
