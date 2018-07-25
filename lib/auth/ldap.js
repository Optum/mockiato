const passport = require('passport');
const LdapStrategy = require('passport-ldapauth');

// info required for LDAP bind
const adUser = 'ms\\' + process.env.AD_USER;
const adPass = process.env.AD_PASS;

const ldapUrl = process.env.LDAP_URL;
const ldapSearchBase = process.env.LDAP_SEARCH_BASE;
// fix for special character issue in OpenShift
const ldapSearchFilter = replaceAmp(process.env.LDAP_SEARCH_FILTER);

passport.use(new LdapStrategy({
    server: {
      url: ldapUrl,
      bindDN: adUser,
      bindCredentials: adPass,
      searchBase: ldapSearchBase,
      searchFilter: ldapSearchFilter
    }
}));

function replaceAmp(str) {
    const uni = '\\u0026';
    if (str.includes(uni)) {
        return str.replace(uni, '&');
    }
    return str;
}
