


class Wifi {

    // WIFI初始化 ~ WIFI设备查找
    startWifi() {
        return new Promise((reslove, reject) => {
            wx.startWifi({
                success: function (res) {
                    reslove(res)
                },
                fail: function (err) {
                    reject(err)
                }
            })
        })
    }

    getConnectedWifi() {
        return new Promise((reslove, reject) => {
            wx.getConnectedWifi({
                success: (res) => {
                    reslove(res.wifi)
                },
                fail: (err) => {
                    reject(err)
                }
            })
        })
    }

    // WIFI初始化 ~ WIFI设备查找end


    // WIFI连接 ~ 
    // WIFI连接 ~ end
}

export default new Wifi();
