import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {describe,expect,it} from 'vitest';
const script=readFileSync('public/assets/js/modules/78-cafeteria.js','utf8');
function render(menu,role='Administrator'){
 const context={M:{},window:{},state:{role,cafeteriaWorkspace:{userId:'qa',menu,wallets:[],transactions:[],plans:[],loaded:true,tab:'Menu',q:'',page:1}},commUserId:()=> 'qa',studentEscape:s=>String(s??'').replaceAll('<','&lt;'),studentClick:()=>'',setTimeout:()=>{}};
 runInNewContext(script,context);return context.M.cafeteria();
}
describe('saved cafeteria workspace',()=>{
 it('shows an honest empty state without prototype meals',()=>{const html=render([]);expect(html).toContain('No saved records for this view.');expect(html).not.toContain('250 kcal');});
 it('renders saved nutrition and escapes authored meal names',()=>{const html=render([{day:'Monday',breakfast:{item:'<script>meal',calories:250,vegetarian:true,allergens:['Milk']}}]);expect(html).toContain('&lt;script>meal');expect(html).toContain('250 kcal');expect(html).toContain('Milk');expect(html).toContain('Not configured');});
 it('keeps money recording controls out of the family view',()=>{const html=render([],'Parent');expect(html).not.toContain('Record purchase');expect(html).not.toContain('Record top-up');expect(html).toContain('Care plans');});
});
