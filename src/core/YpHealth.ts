import * as cheerio from 'cheerio';
import Utility from './Utility';
import * as vm from 'vm';

type msgT<T> = {status: number, msg: T};
type nowT = {nowdate: string, nowtime: string};

export default class YpHealth {
    public static HOST = 'http://ehallwx.ypc.edu.cn';
    public static TABLE_ID = '2cd898ec1e394ab1a4c7c539a41a1487';

    private headers: { [key: string]: string } = {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/7.0.18(0x17001229) NetType/WIFI Language/zh_CN Edg/88.0.4324.96',
    };

    private readonly pos: string;

    private WEBAPI: { [key: string]: any };
    private serviceDate = '';
    private serviceTime = '';

    constructor(cookies: { [key: string]: string }, position?: string) {
        this.headers['Cookie'] = Object.keys(cookies).map(key => `${key}=${cookies[key]}`).join('; ');
        this.pos = position ? position : '';
    }

    public async init(): Promise<msgT<string>> {
        const url = `${YpHealth.HOST}/Pages/Detail.aspx?ID=${YpHealth.TABLE_ID}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: this.headers,
            redirect: 'manual',
        });

        if (response.status === 302) {
            return Promise.reject({status: 0, msg: 'May cookie expired, please re-get the cookie.'});
        }

        if (response.status !== 200) {
            return Promise.reject({status: 0, msg: `Failed to get ${url}, status: ${response.status}`});
        }



        const text = await response.text();
        // parse the html
        const $ = cheerio.load(text);
        $('script').each((index, element) => {
            const script = $(element).html();
            if (script && script.indexOf('var WEBAPI') !== -1) {
                const str = script.match(/var WEBAPI=(.*);/)[1];
                // Sandbox the script
                this.WEBAPI = vm.runInNewContext(`(${str})`);
            }
        });

        return {status: 1, msg: 'success'};
    }

    private async TaskExeSql(key: string): Promise<msgT<string | object>> {
        const params = new URLSearchParams();
        params.append('Action', 'exesql');
        params.append('flag', 'Query');
        params.append('t', Utility.getTimeStamp().toString());

        const url = `${YpHealth.HOST}${this.WEBAPI.TASKHANDLER_URL}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                ...this.headers,
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
            },
            body: params.toString() + `&strSQLKey=${key}`,
            redirect: 'manual'
        });

        if (response.status === 302) {
            return Promise.reject({status: 0, msg: 'May cookie expired, please re-get the cookie.'});
        }

        if (response.status !== 200) {
            return Promise.reject({status: 0, msg: `Failed to get ${url}, status: ${response.status}`});
        }
        // console.log(response.text());

        return {status: 1, msg: await response.json()};
    }

    private async queryServiceDate(): Promise<msgT<nowT>> {
        const key = 'SELECT_GETDATE%24';
        const data = await this.TaskExeSql(key);
        if (!data.status) {
            return Promise.reject(data);
        }
        return {status: 1, msg: <nowT>data.msg[0]};
    }

    private async queryLastReport(): Promise<msgT<object>> {
        const key = `SYS_SJYZ%24${this.WEBAPI.USERAPI.USERID}%7E${Utility.getYesterdaysDate(1)}`;
        const data = await this.TaskExeSql(key);
        if (!data.status) {
            return Promise.reject(data);
        }
        return {status: 1, msg: data.msg[0]};
    }

    private async queryTodayReport(): Promise<msgT<object>> {
        const key = `SYS_SJYZ%24${this.WEBAPI.USERAPI.USERID}%7E${Utility.getYesterdaysDate(0)}`;
        const data = await this.TaskExeSql(key);
        if (!data.status) {
            return Promise.reject(data);
        }
        return {status: 1, msg: data.msg[0]};
    }

    private async generateReport(pos?: string): Promise<object> {
        const now = await this.queryServiceDate();
        if (!now.status) {
            return Promise.reject(now);
        }
        const oldReport = await this.queryLastReport();
        if (!oldReport.status) {
            return Promise.reject(oldReport);
        }

        oldReport['GUID'] = this.WEBAPI.GUID;
        oldReport['YQ_SBRQ'] = now.msg.nowdate;
        oldReport['BZSJ'] = now.msg.nowtime;
        oldReport['YQDATE'] = now.msg.nowdate;
        oldReport['YQ_DRTW'] = (Math.random() * 0.6 + 36.3).toFixed(1); // range 36.3 - 36.9, step 0.1
        oldReport['YQ_SZD'] = pos ? pos : oldReport['YQ_SZD'];
        // construct the report.
        return {
            main: [{
                TableName: 'PROC_YQBS',
                Data: [oldReport],
                TableId: YpHealth.TABLE_ID,
            }],
            sub: [],
            LoginUserID: this.WEBAPI.USERAPI.USERID,
            GUID: this.WEBAPI.GUID,
            FORMID: this.WEBAPI.FORMID,
        };
    }

    public async submitReport(): Promise<msgT<string>> {
        const todayReport = await this.queryTodayReport();
        if (todayReport) {
            return Promise.reject({status: 0, msg: 'today has been reported'});
        }
        const data = await this.generateReport(this.pos);
        if (!data) {
            return Promise.reject({status: 0, msg: 'Failed to generate report'});
        }

        const params = new URLSearchParams();
        params.append('Action', 'submit_model');
        params.append('t', Utility.getTimeStamp().toString());
        //
        const url = `${YpHealth.HOST}${this.WEBAPI.TASKHANDLER_URL}?${params.toString()}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                ...this.headers,
                'Content-Type': 'application/json; charset=UTF-8'
            },
            body: JSON.stringify(data),
            redirect: 'manual'
        });

        if (response.status === 302) {
            return Promise.reject({status: 0, msg: 'May cookie expired, please re-get the cookie.'});
        }
        if (response.status !== 200) {
            return Promise.reject({status: 0, msg: `Failed to get ${url}, status: ${response.status}`});
        }
        return await response.json();
    }

    public static async run(cookies: { [key: string]: string }, position?: string): Promise<msgT<string>> {
        const yp = new YpHealth(cookies, position);
        const init = await yp.init();
        if (!init.status) {
            return Promise.reject(init);
        }
        return await yp.submitReport();
    }
}
