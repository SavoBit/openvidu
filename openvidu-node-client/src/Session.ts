/*
 * (C) Copyright 2017-2018 OpenVidu (http://openvidu.io/)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import { MediaMode } from './MediaMode';
import { OpenViduRole } from './OpenViduRole';
import { RecordingLayout } from './RecordingLayout';
import { RecordingMode } from './RecordingMode';
import { SessionProperties } from './SessionProperties';
import { TokenOptions } from './TokenOptions';

declare const Buffer;
declare const require;

const https = require('https');

export class Session {

    private static readonly API_SESSIONS = '/api/sessions';
    private static readonly API_TOKENS = '/api/tokens';

    sessionId: string;
    properties: SessionProperties;

    constructor(private hostname: string, private port: number, private basicAuth: string, properties?: SessionProperties) {
        if (!properties) {
            this.properties = {};
        } else {
            this.properties = properties;
        }
    }

    /**
     * Gets the unique identifier of the Session. This translates into a new request to OpenVidu Server if this Session has no `sessionId` yet
     * or simply returns the existing value if it has already been retrieved
     *
     * @returns A Promise that is resolved to the _sessionId_ if success and rejected with an Error object if not (due to a `400 (Bad Request)` error in OpenVidu Server)
     */
    public getSessionId(): Promise<string> {
        return new Promise<string>((resolve, reject) => {

            if (!!this.sessionId) {
                resolve(this.sessionId);
            }

            const requestBody = JSON.stringify({
                mediaMode: !!this.properties.mediaMode ? this.properties.mediaMode : MediaMode.ROUTED,
                recordingMode: !!this.properties.recordingMode ? this.properties.recordingMode : RecordingMode.MANUAL,
                defaultRecordingLayout: !!this.properties.defaultRecordingLayout ? this.properties.defaultRecordingLayout : RecordingLayout.BEST_FIT,
                defaultCustomLayout: !!this.properties.defaultCustomLayout ? this.properties.defaultCustomLayout : ''
            });

            const options = {
                hostname: this.hostname,
                port: this.port,
                path: Session.API_SESSIONS,
                method: 'POST',
                headers: {
                    'Authorization': this.basicAuth,
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(requestBody)
                }
            };

            const req = https.request(options, (res) => {
                let body = '';
                res.on('data', (d) => {
                    // Continuously update stream with data
                    body += d;
                });
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        // SUCCESS response from openvidu-server. Resolve sessionId
                        const parsed = JSON.parse(body);
                        this.sessionId = parsed.id;
                        resolve(parsed.id);
                    } else {
                        // ERROR response from openvidu-server. Resolve HTTP status
                        reject(new Error(res.statusCode));
                    }
                });
            });

            req.on('error', (e) => {
                reject(e);
            });
            req.write(requestBody);
            req.end();
        });
    }

    /**
     * Gets a new token associated to Session object. This always translates into a new request to OpenVidu Server
     *
     * @returns A Promise that is resolved to the _token_ if success and rejected with an Error object if not (due to a `400 (Bad Request)` error in OpenVidu Server)
     */
    public generateToken(tokenOptions?: TokenOptions): Promise<string> {
        return new Promise<string>((resolve, reject) => {

            const requestBody = JSON.stringify({
                session: this.sessionId,
                role: !!tokenOptions.role ? tokenOptions.role : OpenViduRole.PUBLISHER,
                data: !!tokenOptions.data ? tokenOptions.data : ''
            });

            const options = {
                hostname: this.hostname,
                port: this.port,
                path: Session.API_TOKENS,
                method: 'POST',
                headers: {
                    'Authorization': this.basicAuth,
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(requestBody)
                }
            };

            const req = https.request(options, (res) => {
                let body = '';
                res.on('data', (d) => {
                    // Continuously update stream with data
                    body += d;
                });
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        // SUCCESS response from openvidu-server. Resolve token
                        const parsed = JSON.parse(body);
                        resolve(parsed.id);
                    } else {
                        // ERROR response from openvidu-server. Resolve HTTP status
                        reject(new Error(res.statusCode));
                    }
                });
            });

            req.on('error', (e) => {
                reject(e);
            });
            req.write(requestBody);
            req.end();
        });
    }

}