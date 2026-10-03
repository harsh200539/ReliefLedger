import { env } from 'cloudflare:workers';
import { mutate, seed, Failure } from '@/lib/engine';
import { ZodError } from 'zod';
import { KIND } from '@/lib/config';
const db=()=>{const d=(env as unknown as {DB:D1Database}).DB;if(!d)throw new Failure(503,'Database unavailable');return d};
async function state(){await db().prepare('INSERT OR IGNORE INTO workspace (id,version,content) VALUES (1,0,?)').bind(JSON.stringify(seed(KIND))).run();const row=await db().prepare('SELECT version,content FROM workspace WHERE id=1').first<{version:number;content:string}>();if(!row)throw new Failure(503,'Workspace unavailable');return {version:row.version,data:JSON.parse(row.content)}}
const json=(v:any,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store'}});
function fail(e:any){if(e instanceof ZodError)return json({error:e.issues.map(i=>i.path.join('.')+': '+i.message).join('; ')},400);if(e instanceof Failure)return json({error:e.message},e.status);console.error(e);return json({error:'Operation could not be completed. Refresh and try again.'},409)}
export async function GET(){try{const s=await state();return json({...s.data,version:s.version,kind:KIND})}catch(e){return fail(e)}}
export async function POST(req:Request){try{
 if(req.headers.get('x-workbench-request')!=='1'||req.headers.get('origin')!==new URL(req.url).origin)throw new Failure(403,'Same-origin workspace requests required');
 if(Number(req.headers.get('content-length')||0)>20000)throw new Failure(413,'Request too large');const raw=await req.text();if(raw.length>20000)throw new Failure(413,'Request too large');let body;try{body=JSON.parse(raw)}catch{throw new Failure(400,'Invalid JSON')}
 const s=await state();if(body.version!==s.version)throw new Failure(409,'Workspace changed. Refresh and preview again.');const out=mutate(s.data,body,KIND);
 if(!out.readonly){const actor=req.headers.get('oai-authenticated-user-id')||'platform-service';if(s.data.events[0])s.data.events[0].actor=actor;const serialized=JSON.stringify(s.data);if(serialized.length>1800000)throw new Failure(409,'Workspace size limit reached');const update=await db().prepare('UPDATE workspace SET content=?, version=version+1 WHERE id=1 AND version=?').bind(serialized,s.version).run();if(update.meta.changes!==1)throw new Failure(409,'Another action completed first. Refresh and try again.')}
 return json({result:out.result,version:s.version+(out.readonly?0:1)})
 }catch(e){return fail(e)}}
