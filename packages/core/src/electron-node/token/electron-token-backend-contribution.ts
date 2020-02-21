/********************************************************************************
 * Copyright (C) 2020 Ericsson and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

import * as ws from 'ws';
import * as http from 'http';
import express = require('express');
import { injectable, inject } from 'inversify';
import { BackendApplicationContribution } from '../../node';
import { MessagingContribution } from '../../node/messaging/messaging-contribution';
import { ElectronTokenValidator } from './electron-token-validator';

/**
 * This component contributes a middleware that will refuse all requests that do not include a specific token.
 */
@injectable()
export class ElectronTokenBackendContribution implements BackendApplicationContribution {

    @inject(ElectronTokenValidator)
    protected readonly tokenValidator: ElectronTokenValidator;

    configure(app: express.Application): void {
        app.use(this.expressMiddleware.bind(this));
    }

    /**
     * Only allow token-bearers.
     */
    protected expressMiddleware(req: express.Request, res: express.Response, next: express.NextFunction): void {
        if (this.tokenValidator.allowRequest(req)) {
            next();
        } else {
            console.error(`refused an http request: ${req.connection.remoteAddress}`);
            res.sendStatus(403);
        }
    }

}

/**
 * Override the browser MessagingContribution class to refuse connections that do not include a specific token.
 */
@injectable()
export class ElectronMessagingContribution extends MessagingContribution {

    @inject(ElectronTokenValidator)
    protected readonly tokenValidator: ElectronTokenValidator;

    /**
     * The Browser API doesn't allow us to define custom headers.
     * Then, in order to authorize a connect, we will expect the first message to contain a token.
     */
    protected handleConnection(socket: ws, request: http.IncomingMessage): void {
        if (this.tokenValidator.allowRequest(request)) {
            super.handleConnection(socket, request);
        } else {
            console.error(`refused a websocket connection: ${request.connection.remoteAddress}`);
            socket.close();
        }
    }

}
