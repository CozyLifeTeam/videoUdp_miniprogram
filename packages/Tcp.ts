
// import 

import { Uint8ToStr } from "../utils/decrypt";
import { ab2ToArr } from "../utils/util";

/**
 * # 介绍:
 * 这是一个官网 TCP通信 的封装库 [TCPSocket](https://developers.weixin.qq.com/miniprogram/dev/api/network/tcp/TCPSocket.html)
 * 
 * 在本项目中，主要用作 `内网直连` 的控制方式，即通过 TCP 对内网中的设备进行控制
 * 
 * # 使用方法:
 * 1. 在进入控制面板时，调用 connect 连接设备
 * 2. 调用 write 发送控制指令给设备
 * 3. 在页面中创建函数 TCPcallback 进行接收设备消息
 * 
 */
export class TCPSocketModel {
    public tcp: WechatMiniprogram.TCPSocket;
    public address;
    public port;
    public pre = 0;

    constructor() {
        this.tcp = wx.createTCPSocket();
    }

    /**
     * 连接指定的ip地址和端口
     * @param address ip地址
     * @param port 端口
     */
    connect(address, port) {
        this.address = address;
        this.port = port;
        return new Promise((reslove, reject) => {
            this.tcp.connect({ address, port });
            this.tcp.onConnect((res) => {
                reslove(res)
            })
            setTimeout(() => {
                reject("失败")
            }, 2000);
        })
    }

    write(cmd: number, message: object) {
        try {
            const msg = {
                cmd: cmd,
                pv: 0,
                sn: "" + new Date().getTime(),
                msg: message
            }
            this.tcp.write(msg + '\r' + '\n');
            const now = Date.now();
            console.log("write", this.address, this.port, "send23333", now - this.pre);
            this.pre = now;
        }
        catch (err) {
            console.log(err);
        }
    }

    onMessage(fn: Function) {
        this.tcp.onMessage(res => {
            const { message } = res;
            const byteArr = ab2ToArr(message);
            const messageStr = Uint8ToStr(byteArr);
            fn(JSON.parse(messageStr));
        })
    }
}

export const TCPSocket = new TCPSocketModel()