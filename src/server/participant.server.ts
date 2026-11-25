import {getPool} from './db.server';
import {seedEvents, type ParticipantData, type Event, type Team} from '../lib/participant-types';
import type {SessionUser} from '../lib/auth-types';
import type {PoolClient} from 'pg';
export async function participantData(user:SessionUser, action?:{kind:string; eventId?: number | undefined; name?: string | undefined}):Promise<ParticipantData>{
 const db=await getPool().connect();
 try {
 await db.query('begin');
 await db.query('select pg_advisory_xact_lock(727275)');
 for(const e of seedEvents) await db.query('insert into participant_events values ($1,$2,$3,$4,$5,$6,$7,$8) on conflict(id) do nothing',[e.id,e.title,e.category,e.date+'+05:30',e.location,e.image,e.description,e.capacity]);
 if(action) await mutate(db,user.id,action);
 const events=(await db.query<Event>('select id,title,category,date::text,location,image,description,capacity from participant_events order by id')).rows;
 const registrations=(await db.query<{event_id:number}>('select event_id from participant_registrations where user_id=$1',[user.id])).rows.map(r=>r.event_id);
 const teams=(await db.query<Team>(`select t.name,t.event_id as "eventId",array_agg(u.name order by u.id) as members from participant_teams t join participant_members m on m.team_id=t.id join users u on u.id=m.user_id where exists(select 1 from participant_members mine where mine.team_id=t.id and mine.user_id=$1) group by t.id`,[user.id])).rows;
 const announcements=(await db.query<{title:string;date:string;body:string}>("select title,to_char(created_at,'MON DD, YYYY') as date,body from participant_announcements order by id desc")).rows;
 await db.query('commit'); return {events,registrations,teams,announcements,user:{name:user.name,email:user.email}};
 }catch(e){await db.query('rollback');throw e}finally{db.release()}
}
async function mutate(db:PoolClient,user:number,a:{kind:string;eventId?: number | undefined;name?: string | undefined}){
 if(a.kind==='register'||a.kind==='cancel'){
 if(a.kind==='cancel'){await db.query('delete from participant_registrations where user_id=$1 and event_id=$2',[user,a.eventId]);return}
 const r=await db.query('insert into participant_registrations select $1,id from participant_events e where id=$2 and date>now() and (select count(*) from participant_registrations where event_id=e.id)<capacity on conflict do nothing',[user,a.eventId]); if(!r.rowCount)throw new Error('Registration unavailable');return;
 }
 const name=a.name?.trim(); if(!name)throw new Error('Team name required');
 if(a.kind==='create'){const r=await db.query<{id:number}>('insert into participant_teams(name,event_id) values($1,2) returning id',[name]);await db.query('insert into participant_members values($1,$2)',[r.rows[0]!.id,user]);return}
 const t=(await db.query<{id:number}>('select id from participant_teams where lower(name)=lower($1)',[name])).rows[0];if(!t)throw new Error('Team not found');
 if(a.kind==='join'){const r=await db.query('insert into participant_members select $1,$2 where (select count(*) from participant_members where team_id=$1)<4 on conflict do nothing',[t.id,user]);if(!r.rowCount)throw new Error('Team full or already joined');}
 if(a.kind==='leave'){await db.query('delete from participant_members where team_id=$1 and user_id=$2',[t.id,user]);await db.query('delete from participant_teams where id=$1 and not exists(select 1 from participant_members where team_id=$1)',[t.id]);}
}
