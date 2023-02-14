// 1.7.0 及以上版本，最多可以同时存在 5 个 WebSocket 连接。
// 1.7.0 以下版本，一个小程序同时只能有一个 WebSocket 连接，如果当前已存在一个 WebSocket 连接，会自动关闭该连接，并重新创建一个 WebSocket 连接。
import { ADDRESS_WEBSOCKET, CONNECTION_WEBSOCKET_TIMEOUT } from "../constants/server";
import { decryptWSMessage } from "../utils/decrypt";

// 封装的 websocket 官方api基类
class WebSocketApiBase {
    public url: string;
    public ws: WechatMiniprogram.SocketTask | any;
    public isConnect = false;

    constructor(url: string) {
        this.url = url;
    }

    connectSocket() {
        return new Promise((reslove, reject) => {
            // if (this.ws != undefined) {
            //     reslove("已有socket连接");
            //     return;
            // }
            this.ws = wx.connectSocket({
                url: this.url,
                success: res => {
                    this.isConnect = true;
                    reslove(res);
                },
                fail: err => {
                    reject(err)
                }
            });
        })
    }

    ws_send(data) {
        return new Promise((reslove, reject) => {
            if (this.isConnect) {
                this.ws.send({
                    data: data,
                    success: (res) => {
                        reslove("通过 socket 发送的 message :" + data)
                    },
                    fail: err => {
                        reject(err);
                    }
                })
            } else {
                this.ws_send(data);
            }

        })
    }

    /**
     * websocket连接打开
     * @param fn 要执行的函数
     */
    onOpen(fn) {
        this.ws.onOpen(() => {
            fn();
        })
        this.ws.onError(err => {
            console.log(err, "websocket连接失败");
            wx.showToast({
                title: "socket连接失败，请重新启动",
                icon: 'none'
            })
        })
    }
}


// 在公网中，客户端与设备端的通信主要依赖Websocket，
class WebSocketModel extends WebSocketApiBase {
    private wsSocketTimer;

    constructor() {
        super(ADDRESS_WEBSOCKET)
    }

    /**
     * 发送心跳包，保持websocket连接
     */
    keepConnect() {
        clearInterval(this.wsSocketTimer);
        this.wsSocketTimer = setInterval(() => {
            this.ws_send(`cmd=ping`)
        }, CONNECTION_WEBSOCKET_TIMEOUT)
    }

    /**
     * 订阅某个设备
     * @param device_id 设备id
     * @param device_key 设备key
     */
    async subcribe(device_id: string, device_key: string) {
        // 发送订阅信息
        this.ws_send(`cmd=subscribe&topic=device_${device_id}&from=control&device_id=${device_id}&device_key=${device_key}`)
            .then(res => console.log(res))
            .catch( (err) => {
                console.log(err);
                
                // const demo = await this.connectSocket();
                // console.log(demo);
                
                // this.subcribe(device_id, device_key)
            })
    }


    onError(fn) {
        this.ws.onError
    }
    onClose(fn) {
        this.ws.onClose(res => {
            this.isConnect = false;
            fn(res)
        })
    }

    /**
     * 组装要发送的信息, 并发送
     * @param param 
     */
    assembleDataSend({ msg, cmd, device_id, device_key }) {
        msg = JSON.stringify(msg);
        const timestamp1 = Date.parse(new Date() as any);
        const message = `cmd=publish&topic=control_${device_id}&device_id=${device_id}&device_key=${device_key}&message={"cmd":${cmd},"pv":0,"sn":"${timestamp1}","msg":${msg}}`;

        this.ws_send(message).then(res => console.log(res)).catch(async (err) => {
            await this.connectSocket();
            this.subcribe(device_id, device_key)
        })
    }

    /**
     * websocket的监听回调函数
     * @param fn 外部使用箭头函数
     */
    onMessage(fn: Function) {
        this.ws.onMessage(res => {
            console.log(res);
            const response = decryptWSMessage(res.data);
            // console.log("websocket接收到消息：", response);
            if (response.dpid) fn(response);
        })
    }
}

export default new WebSocketModel()