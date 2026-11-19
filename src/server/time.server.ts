// "Today" for the fest means today in India, whatever timezone the server runs in.
// SQL for the moment today began (midnight, India time), as a timestamp.
export const TODAY_START = "(date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata')";
