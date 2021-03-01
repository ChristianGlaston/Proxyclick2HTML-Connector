/* global location, XMLHttpRequest, URLSearchParams */

const CLIENT_ID = '***Add your CLIENT ID here***';
const CLIENT_SECRET = '***Add your CLIENT SECRET here***';
const USERNAME = '***Add your username here***';
const PASSWORD = '***Add your username's password here***';

const $visits = document.querySelector('#visits');
const $visitTemplate = document.querySelector('.visit');
function isCustomFieldTrue (visit, key) {
  if (visit.customFields) {
    return visit.customFields.find(function ({ id, value }) {
      return value && (id === key);
    });
  }
}                                        


(async () => {
  try {
    const accessToken = await getAuthToken();

    const companies = await getCompanies(accessToken);

    await pollVisits(accessToken, companies[0].id);
  } catch (err) {
    console.error(new Error(err));
    setTimeout(() => location.reload(), 30000);
  }
})();

async function getAuthToken () {
  const response = await post(
    'https://idid2.fi/proxyclick/oauth/token', {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    searchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'password',
      username: USERNAME,
      password: PASSWORD
    })
  );

  const { access_token: accessToken } = JSON.parse(response);

  if (!accessToken) {
    throw new Error('Something went wrong fetching access token');
  }

  return accessToken;
}

async function getCompanies (accessToken) {
  const response = await get('https://api.proxyclick.com/v1/companies', {
    Authorization: `Bearer ${accessToken}`
  });

  const companies = JSON.parse(response);

  if (!companies || !companies.length) {
    throw new Error('Something went wrong fetching companies');
  }

  return companies;
}

async function pollVisits (accessToken, companyId, lastTimestamp) {
  await getVisits(accessToken, companyId, lastTimestamp);
  await new Promise((resolve) => setTimeout(resolve, 30000));
  await pollVisits(accessToken, companyId, lastTimestamp);
}

async function getVisits (accessToken, companyId, lastTimestamp) {
  const fromDate = new Date();
  const toDate = new Date();

  const response = await get(`https://api.proxyclick.com/v1/companies/${companyId}/vm/visits?from=${fromDate.toISOString()}&to=${toDate.toISOString()}&mode=all`, {
    Authorization: `Bearer ${accessToken}`
  });

  const { visits } = JSON.parse(response);

  $visits.textContent = '';

  for (const visit of visits) {
    const { visitor, status, expectedAt, customFields } = visit;
    const { value: statusValue } = status;
    const { firstname, lastname, companyName } = visitor;

    if (expectedAt && isCustomFieldTrue(visitor, 41118)) {
        
      const $visit = $visitTemplate.cloneNode(true);

      $visit.classList.add(statusValue.toLowerCase());

      
      $visit.querySelector('.visitor-firstname').textContent = firstname;
      $visit.querySelector('.visitor-lastname').textContent = lastname;
      $visit.querySelector('.visitor-lastname').textContent = lastname;
      $visit.querySelector('.visitor-company').textContent = companyName;

      $visits.appendChild($visit);
    }
  }
}

function searchParams (params) {
  const searchParams = new URLSearchParams();

  for (const key in params) {
    const value = params[key];
    searchParams.append(key, value);
  }

  return searchParams;
}

function get (url, headers) {
  return request('GET', url, headers);
}

function post (url, headers, data) {
  return request('POST', url, headers, data);
}

function request (method, url, headers, data) {
  return new Promise((resolve, reject) => {
    const req = new XMLHttpRequest();

    req.open(method, url, true);

    for (const key in headers) {
      req.setRequestHeader(key, headers[key]);
    }

    req.onload = onload;
    req.onerror = onerror;

    if (data != null) {
      req.send(data);
    } else {
      req.send();
    }

    function onload () {
      if (req.status === 200) {
        resolve(req.responseText);
      } else {
        reject(new Error(String(req.status)));
      }
    }

    function onerror (err) {
      reject(new Error(err));
    }
  });
}
