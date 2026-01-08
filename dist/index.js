import axios from 'axios';
import { parse } from 'node-html-parser';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';

const headers = {
   'Content-Type': 'application/x-www-form-urlencoded',
   'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
   'X-MicrosoftAjax': 'Delta=true',
   'X-Requested-With': 'XMLHttpRequest',
};

class JouwloonSession {
   constructor(session, vestiging, errors) {
      this.session = session;
      this.vestiging = vestiging;
      this.errors = errors.length === 0 ? null : errors;
   }

   static async create(username, password) {
      const session = await createSession(username, password);

      let vestiging;
      let errors = [];

      const validateResponse = validateSession(session);

      if (validateResponse.errors) {
         console.error(validateResponse.errors);
      }

      return new JouwloonSession(session, vestiging, errors);
   }

   async getShifts(start, end) {
      try {
         return await getCalendar(this.session, start, end);
      } catch (err) {
         return err;
      }
   }

   async validateSession() {
      const response = validateSession(this.session);
      if (!response.errors)
         return console.log('No errors found, session valid');
      console.error(response.errors);
   }
}

const validateSession = async (session) => {
   try {
      const result = await session({
         url: '/api/rooster/GetRoosterVestigingen',
         method: 'get',
      }).catch((err) => {
         throw new Error(err.response.status);
      });
      if (!result) {
         throw new Error('No vestiging was returned, session invalid');
      }
      return { vestiging: result.data[0] };
   } catch (err) {
      console.error(err);
      return { errors: err };
   }
};

const createSession = async (username, password) => {
   const jar = new CookieJar();
   const instance = wrapper(
      axios.create({
         jar: jar,
         baseURL: 'https://jouwloon.nl/',
         headers: headers,
      })
   );

   try {
      const response = await instance({
         url: '/Login.aspx',
         method: 'get',
      }).catch((err) => {
         console.log("Couldn't connect to Jouwloon");
         throw new Error(err);
      });

      console.log('GET /Login page status:', response.status);

      const root = parse(response.data);

      const viewstate = root.querySelector('#__VIEWSTATE').attributes['value'];
      const viewstateGenerator = root.querySelector('#__VIEWSTATEGENERATOR')
         .attributes['value'];
      const eventValidation =
         root.querySelector('#__EVENTVALIDATION').attributes['value'];

      const loginRequestData = {
         ctl00$scriptmanager:
            'ctl00$ContentPlaceHolder1$UpdatePanel1|ctl00$ContentPlaceHolder1$Button_Inloggen',
         __EVENTTARGET: '',
         __EVENTARGUMENT: '',
         __VIEWSTATE: viewstate,
         __VIEWSTATEGENERATOR: viewstateGenerator,
         __EVENTVALIDATION: eventValidation,
         ctl00$AppGebruiker: '',
         ctl00$Versie: '',
         ctl00$ContentPlaceHolder1$HiddenTaal: 'Nederlands',
         ctl00$ContentPlaceHolder1$input_Gebruikersnaam: username,
         ctl00$ContentPlaceHolder1$input_Wachtwoord: password,
         ctl00$ContentPlaceHolder1$devtype: '0',
         ctl00$ContentPlaceHolder1$devverz: '0',
         __ASYNCPOST: 'true',
         ctl00$ContentPlaceHolder1$Button_Inloggen: 'Inloggen',
      };

      const loginResponse = await instance({
         url: '/Login.aspx',
         method: 'post',
         data: loginRequestData,
      });

      console.log('Logging in response status:', loginResponse.status);

      return instance;
   } catch (err) {
      console.error(`Err: ${err.message}`);
      console.error(`Err Details: ${err.response?.data}`);
      return err;
   }
};

const getCalendar = async (session, start, end) => {
   const validateResponse = await validateSession(session);
   if (validateResponse.errors) return console.error('Session not valid');
   const vestiging = validateResponse.vestiging;

   const calendarRequestData = {
      klantenData: JSON.stringify([
         { vestigingen: [{ vestId: vestiging['VestigingsID'] }] },
      ]),
      start,
      end,
      timeZone: 'Europe/Amsterdam',
   };

   // Convert to URL-encoded query string:
   const urlEncodedData = Object.entries(calendarRequestData)
      .map(
         ([key, value]) =>
            `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
      )
      .join('&');

   const response = await session({
      url: '/api/rooster/GetKalender',
      method: 'post',
      data: urlEncodedData,
   });
   const shifts = [];
   for (const i in response.data) {
      const roosterdienst = response.data[i].roosterdienst[0];
      shifts.push({
         id: response.data[i].id,
         start: new Date(roosterdienst['vanafDatum']),
         end: new Date(roosterdienst['totDatum']),
         afdeling: roosterdienst['afdeling'],
         vestiging: roosterdienst['vestiging'],
      });
   }

   console.log('shifts:', shifts);

   return shifts;
};

export default JouwloonSession;
