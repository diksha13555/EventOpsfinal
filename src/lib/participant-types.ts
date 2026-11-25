export type Event = { id:number; title:string; category:string; date:string; location:string; image:string; description:string; capacity:number }
export const seedEvents: Event[] = [
 {id:1,title:'AURORA NIGHTS',category:'Music',date:'2027-02-19T18:00:00',location:'Main Arena',image:'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1400&q=85',description:'An unforgettable night of live music, lights and community.',capacity:400},
 {id:2,title:'CODEVERSE 2027',category:'Hackathon',date:'2027-03-06T09:00:00',location:'Innovation Hub',image:'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1400&q=85',description:'Build, collaborate and turn big ideas into real products.',capacity:200},
 {id:3,title:'CREATIVE PULSE',category:'Culture',date:'2027-03-14T16:00:00',location:'Open Air Theatre',image:'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1400&q=85',description:'A celebration of art, culture and bold expression.',capacity:300},
 {id:4,title:'FUTURE FORUM',category:'Technology',date:'2027-04-02T10:00:00',location:'Conference Hall',image:'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1400&q=85',description:'Meet innovators and explore what comes next.',capacity:180},
 {id:5,title:'MIDNIGHT BEATS',category:'Music',date:'2027-04-10T19:00:00',location:'Festival Grounds',image:'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1400&q=85',description:'Electric performances beneath the stars.',capacity:500},
 {id:6,title:'MAKERS MARKET',category:'Culture',date:'2027-04-18T11:00:00',location:'Central Courtyard',image:'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1400&q=85',description:'Discover emerging creators and handmade experiences.',capacity:250},
]
export type Team = {name:string; eventId:number; members:string[]}
export type ParticipantData = {events:Event[]; registrations:number[]; teams:Team[]; user:{name:string;email:string}; announcements:{title:string;date:string;body:string}[]}
