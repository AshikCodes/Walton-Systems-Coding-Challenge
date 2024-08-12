const axios = require('axios')
const sgMail = require('@sendgrid/mail')
require('dotenv').config()


const MONDAY_API_URL = process.env.MONDAY_API_URL
const MONDAY_API_KEY = process.env.MONDAY_API_KEY
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY

const query = `
  query {
    boards(ids: 1901922595) { 
      items_page(limit: 500) {
        items {
          id
          name
          column_values(ids: ["name", "email_content", "email"]) {
            id
            text
          }
        }
      }
    }
  }
`;

const fetchMondayBoardData = async () => {
  try {
    const response = await axios.post(
      MONDAY_API_URL,
      { query },
      {
        headers: {
          Authorization: `Bearer ${MONDAY_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const items = response.data.data.boards[0].items_page.items
    console.log(`Items here: ${JSON.stringify(items, null, 2)}`)

    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('cant get items')
    }

    sgMail.setApiKey(SENDGRID_API_KEY)

    for (const item of items) {
      const email = item.column_values.find(col => col.id === 'email')?.text
      const emailContent = item.column_values.find(col => col.id === 'email_content')?.text

      if (!email || !emailContent) {
        continue;
      }

    const msg = {
        personalizations: [
          {
            to: [{ email: email }], 
            subject: 'Email Subject'
          }
        ],
        from: {
          email: 'areji@torontomu.ca' 
        },
        content: [
          {
            type: 'text/plain',
            value: emailContent 
          }
        ]
      };

      try {
        await axios.post('https://api.sendgrid.com/v3/mail/send', msg, {
          headers: {
            Authorization: `Bearer ${SENDGRID_API_KEY}`,
            'Content-Type': 'application/json',
          },
        });
        console.log(`email sent to ${email}`)
      } catch (error) {
        console.error(`errror sending email to ${email}:`, error.response ? error.response.data : error.message)
      }
    }
  } catch (error) {
    console.error('error fetching data from monday', error.message)
  }
};

fetchMondayBoardData()


// railway config
// {
//   "build": {
//     "builder": "nixpacks"
//   },
//   "deploy": {
//     "start": "node main2.js"
//   },
//   "schedules": [
//     {
//       "cron": "0 */4 * * 1-5",
//       "command": "node main2.js"
//     }
//   ]
// }