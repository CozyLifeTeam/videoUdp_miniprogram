
// import 

import { Uint8ToStr } from "../utils/decrypt";
import { ab2ToArr } from "../utils/util";

/**
 * # 介绍:
 * 这是一个官网 TCP通信 的封装库 [TCPSocket](https://developers.weixin.qq.com/miniprogram/dev/api/network/tcp/TCPSocket.html)
 * 
 * 在本项目中，主要用作 `内网直连` 的控制方式，即通过 TCP 对内网中的设备进行控制
 */
export class TCPSocketModel {
    public tcp: WechatMiniprogram.TCPSocket[] = [];
    public propsTCPSocketMessage: Function = (res) => { };

    constructor() { }

    /**
     * 连接指定的ip地址和端口
     * @param address ip地址
     * @param port 端口
     */
    connect(address, port, device_id) {
        const tcpsocket = wx.createTCPSocket();
        tcpsocket.connect({ address, port });
        Object.assign(tcpsocket, { connectStatus: null })
        tcpsocket.onConnect(res => {
            console.log("连接成功tcp:" + address);
            tcpsocket.connectStatus = 'success';
        })
        tcpsocket.onClose(() => {
            if (tcpsocket.connectStatus != "quit")
                tcpsocket.connectStatus = "close";
        })
        tcpsocket.onError(() => {
            if (tcpsocket.connectStatus != "quit")
                tcpsocket.connectStatus = "error";
        })
        tcpsocket.onMessage(res => {
            const { message } = res;
            const messageStr = Uint8ToStr(ab2ToArr(message));
            // 处理tcp粘包问题
            const packages = messageStr.split('\r\n');
            packages.pop();
            packages.forEach(buffer => {
                const messageObject = JSON.parse(buffer);
                const { msg: { data: dpid }, cmd } = messageObject
                messageObject.dpid && this.propsTCPSocketMessage({
                    cmd: cmd,
                    device_id: device_id,
                    dpid: dpid,
                    type: "tcpsocket"
                })

            })
        })
        this.tcp.push(tcpsocket);
        return tcpsocket
    }

    write(cmd: number, message: object, tcpsocket) {
        try {
            const msg = {
                cmd: cmd,
                pv: 0,
                sn: "" + new Date().getTime(),
                msg: message
            }
            tcpsocket.write(msg + '\r' + '\n');
        }
        catch (err) {
            console.log(err);
        }
    }

    onMessage(fn: Function) {
        this.propsTCPSocketMessage = fn
    }

    close() {
        const tcpsocket = this.tcp;
        tcpsocket.forEach(item => {
            item && item.close();
            console.log("关闭TCPSocket:");
            item.connectStatus = "quit"
        });
    }
}

export const TCPSocket = new TCPSocketModel()