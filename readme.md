## 可能见到的单词变量
- decrypt    v. 解密
- assemble   v. 组装/拼接
- device     n. 设备
- subscribe  v. （上行）订阅
- publise    v. （下行）发布





## dpid文档

|              含义              |           标识符           |     类型     |                            枚举值                            |
| :----------------------------: | :------------------------: | :----------: | :----------------------------------------------------------: |
|              开关              |           switch           |    number    | 数值范围：00~FF，转化为二进制为1111 1111<br/>其中每一位代表一路开关，最多支持8路开关同时设置 |
|          开关1倒计时           |        countdown_1         |    number    |                                                              |
|          设备发起呼叫          |    device_request_call     |    number    |        1：设备处于呼叫状态，2：设备不在呼叫状态，弃用        |
|              电量              |        electricity         |    number    |            取值范围0-1000，步进为1, 单位：千分比             |
|           低电量报警           |      low_power_alert       |    number    |                 1：低电量报警；2：不处于报警                 |
|          红外补光设置          |       ir_fill_light        |    number    |                  1：设置补光；2：不设置补光                  |
|            移动检测            |    motion_detect_enable    |    number    |                   1：开启检测；2：关闭检测                   |
|          移动检测报警          |    motion_detect_alert     |    number    |                    1：报警；2：不处于报警                    |
|       设备发起呼叫的原因       | device_request_call_reason |    number    |                枚举值，1：按键；2：检测到移动                |
|          移动检测行为          |    motion_detect_action    |    number    | 枚举值；1：不做任何处理；2：拍图；3：呼叫用户；4：拍图并且呼叫用户 |
|        用户是否应答呼叫        |        user_answer         |    number    |                  枚举值，1：接听；2：不接听                  |
|             会话id             |         session_id         | string 4byte | 该值由设备端、app端生成作为一次通话的随机id。设备端在查询返回时，若该值为空表示设备没有通话中； |
| 用户要求设备推送视频流、音频流 |         user_call          |    number    | 用户主动发起呼叫，需要和session id一起工作。1：用户要求；0：用户取消要求 |
|            通讯类型            |         call_type          |    number    |            枚举值，1：视频；2：音频；3：视频+音频            |
|        用户关闭session         |     user_close_reason      |    number    | 枚举值，0：没有原因，表示不在通话中；1：用户关闭；2：超时关闭 |
|        设备关闭session         |    device_close_reason     |    number    | 枚举值，，0：没有原因，表示不在通话中；1：用户没有接听；2：超时关闭 |
|           视频分辨率           |      video_resolution      |    number    |                    枚举值，1:720p；2:480p                    |
|            视频帧率            |         video_fps          |    number    |                    取值范围1-30，步进为1                     |
|      设备端推送类型的枚举      |         push_type          |    number    |  枚举类型；1：内网通信；2：公网通信；3：内网通信和公网通信   |
|        设备是否应答呼叫        |       device_answer        |    number    |                  枚举值，1：接听；2：不接听                  |
|     使用的协议版本（暂无）     |                            |              |                                                              |



## 使用

```js
// app.js

import WebSocket from "./packages/WebSocket";

// 连接websocket
await WebSocket.connectSocket();
WebSocket.keepConnect();
WebSocket.onMessage(({ cmd, device_id, dpid, res, num }) => {
    const p = getCurrentPages();
    const { openDeviceInfo } = this.globalData;
    if (
        device_id == openDeviceInfo?.device_id ||
        device_id == undefined
    ) {
        if (typeof (p[p.length - 1].TCPcallback) === 'function') {
            p[p.length - 1].TCPcallback(dpid, cmd);
        } else {
            p[0].TCPcallback(dpid, cmd);
        }
    }
});
```



```js
// index.js

/**
* 订阅我的全部设备
*/
subscribeMyDevices(deviceArr) {
    deviceArr.map(item => WebSocket.subcribe(item.device_id))
},
```



```js
// 设备控制面板页

TCPcallback(data, cmd) {
    // data 即为 dpid
    // ......
}
```

## 内网直连

```js
// app.js
// 连接websocket
await WebSocket.connectSocket();
WebSocket.keepConnect();
WebSocket.onMessage(({ cmd, device_id, dpid, res, num }) => {
    const p = getCurrentPages();
    const { openDeviceInfo } = this.globalData;
    if (typeof (p[p.length - 1].WSocketCallback) === 'function') {
        console.log("WSocketCallback消息传入当前页");
        p[p.length - 1].WSocketCallback(dpid, cmd, device_id);
    } else {
        console.log("WSocketCallback消息回到首页");
        p[0].WSocketCallback(dpid, cmd);
    }
});
// 创建TCPsocket
TCPSocket.onMessage((res) => {
    const p = getCurrentPages();
    const { openDeviceInfo } = this.globalData;

    if (typeof (p[p.length - 1].TCPcallback) === 'function') {
        console.log("TCPcallback消息传入当前页");
        p[p.length - 1].TCPcallback(res);
    } else {
        console.log("TCPcallback消息回到首页");
        p[0].TCPcallback(res);
    }
})
```



```js
// 门铃控制面板
import {init} from "Control.ts"

async onLoad() {
    const { device_id, device_key } = this.data;
    WebSocket.subcribe(device_id, device_key);
    // media是实例对象，state是告诉当前是内网还是公网
    const {media, state} = await init(device_id);
    // 所有方法都在这个media里，方法与以前相同
    // 不同的是：
    // 以前是import导入media
    // 现在是通过初始化获得media
    this.setData({
        media: media
    })
}

// 内网的回调信息都在这里显示
TCPcallback(res) {
    const dpid = res.msg.data;
    const {
        device_request_call,
        electricity,
        session_id,
        device_answer,
        push_type
    } = decryptResponse(dpid);
    .....
}

// 以前叫TCPcallback，命名冲突了，为了避免歧义全部改成了WSocketCallback
WSocketCallback(data) {
    // 注意多了一个push_type
    const {
        device_request_call,
        electricity,
        session_id,
        device_answer,
        push_type
    } = decryptResponse(data)
    // 内网通信的情况
    if (push_type == 1) return;
    .....
}
```



