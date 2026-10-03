import { z } from 'zod';
import { route, allocate, reserve, transition } from './algorithms';
import { seed } from './seed';
export class Failure extends Error { status:number;constructor(status:number,message:string){super(message);this.status=status} }
const text=z.string().trim().min(1).max(100);const number=z.number().finite();
const profile=z.object({maxSlope:number.min(0).max(30),minWidth:number.min(30).max(400),allowSteps:z.boolean(),freshDays:number.int().min(1).max(365),excludeStale:z.boolean()}).strict();
const params=z.object({item:text,capacity:number.int().min(1).max(500),maxDistance:number.min(.1).max(100),payloadKg:number.min(1).max(10000),transportRate:number.min(0).max(1000)}).strict();
export function mutate(state:any,body:any,kind:string,now=Date.now()){
 const id=z.string().uuid();const date=z.string().datetime();const version=number.int().min(0);let detail:any;
 const op=body.action;
 if(op==='route'||op==='save-route'){const b=z.object({action:z.enum(['route','save-route']),start:text,end:text,profile,version}).strict().parse(body);detail=route(state.nodes,state.links,b.start,b.end,b.profile,now);if(op==='route')return {readonly:true,result:detail};if(state.saved.length>=100)throw new Failure(409,'Demo limit: 100 saved routes');state.saved.unshift({id:crypto.randomUUID(),start:b.start,end:b.end,profile:b.profile,result:detail,createdAt:new Date(now).toISOString()})}
 else if(op==='audit'){const b=z.object({action:z.literal('audit'),version,linkId:text,slope:number.min(0).max(30),width:number.min(30).max(400),steps:z.boolean(),closed:z.boolean(),note:z.string().trim().min(5).max(500)}).strict().parse(body);const link=state.links.find((l:any)=>l.id===b.linkId);if(!link)throw new Failure(404,'Link not found');Object.assign(link,{slope:b.slope,width:b.width,steps:Number(b.steps),closed:Number(b.closed),auditedAt:new Date(now).toISOString()});state.audits.unshift({...b,createdAt:new Date(now).toISOString()});state.audits=state.audits.slice(0,200);detail={linkId:b.linkId,note:b.note}}
 else if(op==='preview'){const b=z.object({action:z.literal('preview'),version,parameters:params}).strict().parse(body);return {readonly:true,result:allocate(state.stock,state.requests,b.parameters,kind,now)}}
 else if(op==='reserve'){const b=z.object({action:z.literal('reserve'),version,id,parameters:params}).strict().parse(body);try{detail=reserve(state,b.id,b.parameters,kind,now)}catch(e:any){throw new Failure(409,e.message)}}
 else if(op==='settle'){const b=z.object({action:z.literal('settle'),version,id,status:z.enum(['DELIVERED','CANCELLED'])}).strict().parse(body);detail={id:b.id,status:b.status};try{if(!transition(state,b.id,b.status))return {readonly:true,result:detail}}catch(e:any){throw new Failure(state.plans.some((p:any)=>p.id===b.id)?409:404,e.message)}}
 else if(op==='add-stock'||op==='add-request'){
 const common={action:z.enum(['add-stock','add-request']),version,name:text,item:text,x:number.min(-100).max(100),y:number.min(-100).max(100),grade:z.enum(['A','B','C']),lengthMm:number.int().min(0).max(10000)};
 const b=op==='add-stock'?z.object({...common,available:number.int().min(1).max(1000),expiresAt:date,verified:z.boolean(),weightKg:number.min(.1).max(1000),unitPrice:number.int().min(0).max(10000000)}).strict().parse(body):z.object({...common,quantity:number.int().min(1).max(1000),priority:number.int().min(1).max(5),maxPrice:number.int().min(0).max(10000000),dueAt:date}).strict().parse(body);
 const rows=op==='add-stock'?state.stock:state.requests;if(rows.length>=100)throw new Failure(409,'Demo limit: 100 records');detail={...b,id:crypto.randomUUID(),reserved:0,served:0};delete detail.action;delete detail.version;rows.push(detail)
 }else throw new Failure(400,'Unknown action');
 state.events.unshift({id:crypto.randomUUID(),action:op,detail,createdAt:new Date(now).toISOString()});state.events=state.events.slice(0,300);return {readonly:false,result:detail};
}
export {seed};
