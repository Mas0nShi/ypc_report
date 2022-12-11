import * as express from 'express';
import YpHealth from '../core/YpHealth';
const router = express.Router();



/**
 * @api {post} /api/report Report
 * @apiName Report
 * @apiGroup User
 * @apiVersion 1.0.0
 * @apiDescription 提交健康打卡信息.
 * @apiBody {String} cookie Base64编码的Cookie, 编码部分为<code>ehallwx.ypc.edu.cn.80.Token</code>的值(value)，不包含key.
 * @apiBody {String} [pos] 打卡定位点，URL编码 可选，默认为上次打卡地点
 *
 * @apiParamExample {String} cookie
 * dGVzdGNvb2tpZT10ZXN0
 * @apiParamExample {String} pos
 * %E6%B5%99%E6%B1%9F%E7%9C%81%20%E7%BB%8D%E5%85%B4%E5%B8%82%20%E8%B6%8A%E5%9F%8E%E5%8C%BA
 *
 * @apiSuccess {Number} status 1表示成功，0表示失败.
 * @apiSuccess {String} msg 返回信息.
 * @apiSuccessExample {json} 成功返回:
 * {
 *     "status": 1,
 *     "msg": "提交成功！"
 * }
 *
 * @apiErrorExample {json} 失败返回:
 * {
 *    "status": 0,
 *    "msg": "May cookie expired, please re-get the cookie."
 * }
 */
router.post('/api/report', (req, res) => {

    // if content-type is json, then
    if (!req.is('application/json') && !req.is('application/x-www-form-urlencoded')) {
        res.status(400).json({
            status: 0,
            msg: 'Bad request, please check your request header.'
        });
        return;
    }
    // valid cookie is base64 string.
    const b64_cookie = req.body.cookie;
    if (!b64_cookie || !b64_cookie.match(/^[a-zA-Z0-9+/]+={0,2}$/)) {
        res.status(400).json({
            status: 0,
            msg: 'Bad request, please check your cookie.'
        });
        return;
    }

    const cookie = Buffer.from(req.body.cookie, 'base64').toString();
    const pos = req.body.pos;
    console.log('received: ', cookie, pos);

    YpHealth.run({'ehallwx.ypc.edu.cn.80.Token': cookie}, pos).then(result => {
        res.json(result);
    }).catch(err => {
        console.log(err);
        res.json({
            status: 0,
            msg: err.message ?? err.msg
        });
    });


    // res.setHeader('Content-Type', 'text/plain');
});

export default router;
