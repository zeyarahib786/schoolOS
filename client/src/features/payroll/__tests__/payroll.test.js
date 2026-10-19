import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {describe,expect,it} from 'vitest';
const script=readFileSync('public/assets/js/modules/67-payroll.js','utf8');
function payroll(rows,role='Accountant'){
 let exported;
 const context={M:{},window:{},state:{role,payrollWorkspace:{userId:'qa',rows,staff:[],loaded:true,q:'',month:'All',status:'All',page:1}},commUserId:()=> 'qa',studentDownloadCSV:(name,data)=>{exported={name,data}},studentEscape:String,studentClick:()=>'',kpi:()=>'',feeMoney:(v,c)=>c+' '+v,cellUser:String,chip:String};
 runInNewContext(script,context);return {context,export:()=>{context.window.payrollExport();return exported}};
}
describe('recorded payroll periods and exports',()=>{
 const row={_id:'a',employeeSnapshot:{name:'QA Employee',refId:'EMP-1'},staff:{_id:'staff'},month:'2030-12',currency:'AED',basicSalary:100,allowances:20,deductions:5,netPay:115,status:'Processed'};
 it('shows actual periods across a year boundary',()=>{const {context}=payroll([row,{...row,_id:'b',month:'2031-01'}]);const html=context.M.payroll();expect(html).toContain('2030-12');expect(html).toContain('2031-01');expect(html).not.toContain('June 2025');});
 it('exports saved cents and payment evidence for the filtered period',()=>{const {context,export:download}=payroll([row,{...row,_id:'b',month:'2031-01',netPay:125.25,status:'Paid',paymentReference:'BANK-QA',paymentMethod:'Bank',paidDate:'2031-02-01T00:00:00Z'}]);context.state.payrollWorkspace.month='2031-01';const result=download();expect(result.data).toHaveLength(2);expect(result.data[1]).toEqual(['QA Employee','EMP-1','2031-01','AED',100,20,5,125.25,'Paid','2031-02-01','Bank','BANK-QA']);});
 it('does not grant a family role access to office payroll exports',()=>{expect(payroll([row],'Parent').export()).toBeUndefined();});
});
