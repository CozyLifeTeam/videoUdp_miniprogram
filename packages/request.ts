

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