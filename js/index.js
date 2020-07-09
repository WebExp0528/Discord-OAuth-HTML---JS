var API_URI = "https://discord.com/api";
var OAUTH_URI = "https://discord.com/oauth2/authorize";
var OAUTH_CLIENT_ID = "712931319998447636";
var OAUTH_CLIENT_SECRET = "KZNL_IB2evwN2nqGU_L1uJKXvcGrDqGt";
var OAUTH_REDIRECT_URI = "http://127.0.0.1:5500/discord-oauth/callback";
var OAUTH_RESPONSE_TYPE = "token"; // authorization_code | token
var OAUTH_SCOPE = "identify email guilds";

var CURRENT_USER_API = "/users/@me";
var TOKEN_REFRESH_API = "/oauth2/token";
var GUILDS_API = "/guilds";

var g_tokens = {};

var USER_KEY = "user";
var GUILDS_KEY = "guilds";

function handleClickOAuth() {
    showAuthWindow({ path: getOAuthURI() })
        .then((res) => {
            console.log("~~~~~~ response", res);
            g_tokens = res;

            //get email and guilds
            apiCall(CURRENT_USER_API, "GET", g_tokens)
                .then((data) => {
                    console.log("~~~~~ user data", data);
                    const localStorage = createLocalStorageAccess(USER_KEY);
                    localStorage.set(data);
                })
                .catch((err) => {
                    console.log("~~~~~~~~~~~ Error in getting user", err);
                });

            apiCall(`/users/@me/guilds`, "GET", g_tokens)
                .then((data) => {
                    console.log("~~~~~ guild data", data);
                    const localStorage = createLocalStorageAccess(GUILDS_KEY);
                    localStorage.set(data);
                })
                .catch((err) => {
                    console.log("~~~~~~~~~~~ Error in getting guilds", err);
                });
        })
        .catch(() => {
            console.log("~~~~~~ oauth error");
        });
}

function handleClickSend() {
    const userStorage = createLocalStorageAccess(USER_KEY);
    const user = userStorage.get();
    console.log("~~~~~~~~~~~ stored user data", user);

    const guildsStorage = createLocalStorageAccess(GUILDS_KEY);
    const guilds = guildsStorage.get();
    console.log("~~~~~~~~~~~ stored guilds data", guilds);
}

/**
 * Authorization popup window code
 *
 * @param {windowName: string , windowOptions: string} options
 */
function showAuthWindow(options) {
    return new Promise((resolve, reject) => {
        options.windowName = options.windowName || "Discord OAuth"; // should not include space for IE
        options.windowOptions =
            options.windowOptions || "location=0,status=0,width=500,height=800";
        var that = this;
        that._oauthWindow = window.open(
            options.path,
            options.windowName,
            options.windowOptions
        );
        that._oauthInterval = window.setInterval(function () {
            if (that._oauthWindow.closed) {
                window.clearInterval(that._oauthInterval);
                reject();
            } else {
                var href; // For referencing window url
                try {
                    href = that._oauthWindow.location.href; // set window location to href string
                } catch (e) {
                    console.log("Error:", e); // Handle any errors here
                }

                if (href && href.includes(`${OAUTH_REDIRECT_URI}`)) {
                    var params = getParams(href.replace("#", "?"));
                    setTimeout(() => {
                        that._oauthWindow.close();
                    }, 2000);
                    resolve(params);
                }
            }
        }, 1000);
    });
}

/**
 * Get OAuth URI
 *
 */
function getOAuthURI() {
    var oAuthParams = {
        client_id: OAUTH_CLIENT_ID,
        redirect_uri: OAUTH_REDIRECT_URI,
        response_type: OAUTH_RESPONSE_TYPE,
        scope: OAUTH_SCOPE,
    };
    return `${OAUTH_URI}?${makeURLFromParams(oAuthParams)}`;
}

/**
 * Get tokens from authorization code
 *
 * @param {string} code
 */
function getTokensFromCode(code) {
    var getTokenParams = {
        client_id: OAUTH_CLIENT_ID,
        client_secret: OAUTH_CLIENT_SECRET,
        redirect_uri: OAUTH_REDIRECT_URI,
        grant_type: "authorization_code",
        code: code,
    };
    return new Promise((resolve, reject) => {
        fetch(`${API_URI + TOKEN_REFRESH_API}`, {
            method: "POST",
            body: makeURLFromParams(getTokenParams),
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
        })
            .then((resp) => {
                return resp.json();
            })
            .then((data) => {
                resolve(data);
            })
            .catch((err) => {
                reject(err);
            });
    });
}

/**
 * Refresh tokens from refresh_token
 *
 * @param {string} refresh_token
 */
function getAccessTokenFromRefresh(refresh_token) {
    var tokenRefreshParams = {
        client_id: OAUTH_CLIENT_ID,
        client_secret: OAUTH_CLIENT_SECRET,
        redirect_uri: OAUTH_REDIRECT_URI,
        grant_type: "refresh_token",
        refresh_token: refresh_token,
    };
    return new Promise((resolve, reject) => {
        fetch(`${API_URI + TOKEN_REFRESH_API}`, {
            method: "POST",
            body: makeURLFromParams(tokenRefreshParams),
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
        })
            .then((resp) => {
                return resp.json();
            })
            .then((data) => {
                resolve(data);
            })
            .catch((err) => {
                reject(err);
            });
    });
}

/**
 * Call Discord API
 *
 * @param {string | api end_point} endPoint
 * @param {string | Get, Post, ...} method
 * @param {access_token:string, refresh_token:string, token_type:string} tokens
 */
function apiCall(endPoint, method, tokens, params = {}) {
    return new Promise((resolve, reject) => {
        fetch(`${API_URI + endPoint}`, {
            ...(method.toLowerCase() == "get" ? {} : { body: params }),
            method: method,
            headers: {
                Authorization: `${tokens.token_type} ${tokens.access_token}`,
                "Content-Type": "application/x-www/form-urlencoded",
            },
        })
            .then((resp) => {
                return resp.json();
            })
            .then((data) => {
                resolve(data);
            })
            .catch((err) => {
                reject(err);
            });
    });
}

/**
 * Get params from url string
 *
 * @param {string} url
 */
function getParams(url) {
    var params = {};
    var parser = document.createElement("a");
    parser.href = url;
    var query = parser.search.substring(1);
    var vars = query.split("&");
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split("=");
        params[pair[0]] = decodeURIComponent(pair[1]);
    }
    return params;
}

/**
 * Make URL from json object
 *
 * @param {object} params
 */
function makeURLFromParams(params) {
    return Object.keys(params)
        .map(function (k) {
            return encodeURIComponent(k) + "=" + encodeURIComponent(params[k]);
        })
        .join("&");
}

/**
 * Manage localStorage
 *
 * @param {*} storageProp
 */
function createLocalStorageAccess(storageProp) {
    const propId = `discord_oauth_${storageProp}`;
    return {
        clear: async () => {
            sessionStorage.removeItem(propId);
        },
        get: () => {
            const dataLocal = sessionStorage.getItem(propId);
            return dataLocal ? JSON.parse(dataLocal) : {};
        },
        set: (data) => {
            sessionStorage.setItem(
                propId,
                JSON.stringify({
                    storage: {
                        updated_at: new Date().toISOString(),
                    },
                    ...data,
                })
            );
        },
    };
}
