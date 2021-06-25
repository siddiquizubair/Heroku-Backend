const express = require('express'); 
const request = require('request'); 
const query = require('querystring');

const client_id = '50b5acca0e094bb9988a466ce49b7fe5'; // Your client ID and secret found
const client_secret = 'c6da979415c3459b9c551c34cb3a6792'; // on the Spotify dashboard for your app
const redirect_uri = 'http://localhost:3001/callback/'; // redirect site after authorization
const stateKey = 'spotify_auth_state';

const app = express();

const PORT = process.env.PORT || 3001;
app.use(express.json());

app.get('/login', (req, res) => { // sends spotify auth request after user tries to log in
    let scope = 'user-read-private user-top-read';
    let state = '1234567890'
    res.cookie(stateKey, state);

    res.redirect('https://accounts.spotify.com/authorize?' +
        query.stringify({
            client_id: client_id,
            response_type: 'code',
            redirect_uri: redirect_uri,
            state: 'state',
            scope: scope,
            show_dialog: true
        })
    );
});

app.get('/callback', (req, res) => { // after spotify redirects, second call is made for access and refresh tokens
    let code = req.query.code || null,
        state = req.query.state || null;
    
    if (state === null) {
        res.redirect('/#' +
            query.stringify({
                error: 'state_mismatch'
            })
        );
    } else {
        res.clearCookie(stateKey);
        let oAuth = {
            url: 'https://accounts.spotify.com/api/token',
            form: {
                code: code,
                redirect_uri: redirect_uri,
                grant_type: 'authorization_code',
                client_id: client_id,
                client_secret: client_secret
            },
            json: true
        };

        request.post(oAuth, (error, response, body) => {
            if (!error && response.statusCode === 200) {
                let access_token = body.access_token,
                    refresh_token = body.refresh_token;
                
                let options = {
                    url: 'https://api.spotify.com/v1/me',
                    headers: { 'Authorization': 'Bearer ' + access_token },
                    json: true
                };
            
                res.redirect('/#' + 
                    query.stringify({
                        access_token: access_token,
                        refresh_token: refresh_token
                    })
                );
            } else {
                res.redirect('/#' + 
                    query.stringify({
                        error: 'invalid_token'
                    })
                );
            }
        });
    }
});

app.get('/refresh_token', (req, res) => { // if access token expires, request for a new access token is sent
    let refresh_token = req.query.refresh_token,
        oAuth = {
            url: 'https://accounts.spotify.com/api/token',
            form: {
                grant_type: 'refresh_token',
                refresh_token: refresh_token,
                client_id: client_id,
                client_secret: client_secret
            },
            json: true
        };
    
    request.post(oAuth, (error, response, body) => {
        if (!error && response.statusCode === 200) {
            let access_token = body.access_token;
            res.send({
                'access_token': access_token
            });
        }
    })
})

app.listen(PORT, () => { // start listening
    console.log('listening on 3001')
});