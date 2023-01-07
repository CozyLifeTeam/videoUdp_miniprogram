import { ADDRESS_NOWENV} from "../constants/server"

const domian = ADDRESS_NOWENV;

/**
 * 未封装的 request 请求
 * @param param 
 */
export function request(param: WechatMiniprogram.RequestOption) {
    return new Promise((reslove, reject) => {
        wx.request({
            ...param,
            success: res => {
                reslove(res.data)
            },
            fail: err => {
                reject(err)
            }
        })
    })
}

/**
 * post请求公司服务器接口
 * @param url 接口地址
 * @param data 参数
 */
export function postHttps(url, data = {}) {
    url = domian + url;
    data = JSON.stringify(data);
    return new Promise((reslove, reject) => {
        wx.request({
            url,
            data,
            method: 'POST',
            header:
            {
                'content-type': 'application/json' // 默认值
                //'Cookie': app.cookies,
                //  'content-type': 'application/x-www-form-urlencoded' // 默认值
            },
            success: function (res) {
                reslove(res.data)
            },
            fail: function (res) {
                reject(res);
            }
        })
    });
}


/**
 * get请求公司服务器接口
 * @param url 接口地址
 * @param data 参数
 */
export function getHttps(url, data = {}) {
    url = domian + url
    return new Promise((resove, reject) => {
        wx.request({
            url,
            method: 'GET',
            data,
            header: {

            },
            success(res) {
                resove(res.data);
            },
            fail(res) {
                reject(res)
            },
            complete: function () {
            }
        })
    });
}