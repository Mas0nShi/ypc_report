import * as express from 'express';
import * as http from 'http';
import * as bodyParser from 'body-parser';
import * as morgan from 'morgan';

import router from './Router';
import * as fs from 'fs';
import * as path from 'path';
// create web server to provide the API.

export default class HttpServer {
    private app: express.Application;
    private server: http.Server;
    private readonly port: number;


    constructor(port: number) {
        this.app = express();
        this.port = port;
    }

    public start() {
        const accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' });
        this.app.use(morgan('combined', { stream: accessLogStream }));

        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({ extended: true }));
        this.app.use(router);
        // render statics/doc as the doc page.
        this.app.use('/', express.static(`${__dirname}/statics`));

        this.server = this.app.listen(this.port, () => {
            console.log(`Server started at http://localhost:${this.port}`);
        });


    }

    public stop() {
        this.server.close();
    }


}

