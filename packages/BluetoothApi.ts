
// import * as comm from "../utils/comm1"
import * as decrypt from "../utils/decrypt"

class BluetoothApiBase {
    public connectInfo = {
        deviceId: "",
        serviceId: "00001910-0000-1000-8000-00805F9B34FB",   // 示例值
        CharacteristicsId: "00002B10-0000-1000-8000-00805F9B34FB",  // 示例值
    }
    public writeInfo = {
        deviceId: "",
        serviceId: "00001910-0000-1000-8000-00805F9B34FB",  // 示例值
        CharacteristicsId: "00002B10-0000-1000-8000-00805F9B34FB",  // 示例值
    }
    public isSending = false;

    startBluetoothDevicesDiscovery() {
        return new Promise((reslove, reject) => {
            wx.startBluetoothDevicesDiscovery({
                // 为false时，安卓将表现异常
                allowDuplicatesKey: true,
                success: function (res) {
                    reslove("[ok]2.开启搜索附近的蓝牙设备成功")
                },
                fail: function (err) {
                    reject(err)
                }
            })
        })
    }

    stopBluetoothDevicesDiscovery() {
        wx.stopBluetoothDevicesDiscovery();
    }

    closeBluetoothAdapter() {
        wx.closeBluetoothAdapter();
    }
    // 蓝牙初始化 ~ 蓝牙设备查找end


    // 蓝牙连接 ~ 
    createBLEConnection(deviceId) {
        this.connectInfo.deviceId = deviceId;
        this.writeInfo.deviceId = deviceId;

        return new Promise((resolve, reject) => {
            wx.createBLEConnection({
                deviceId: deviceId,
                success: (res) => {
                    resolve("[ok]4.连接蓝牙设备成功！准备获取蓝牙所有服务 ");
                },
                fail: function (err) {
                    reject("[error]4.连接蓝牙设备失败 ");
                }
            })
        })
    }

    getBLEDeviceServices(deviceId) {
        return new Promise((reslove, reject) => {
            wx.getBLEDeviceServices({
                deviceId: deviceId,
                success: (res) => {
                    for (let i = 0; i < res.services.length; i++) {
                        if (res.services[i].isPrimary) {
                            this.connectInfo.serviceId = res.services[i].uuid;
                            break;
                        }
                    }
                    reslove("[ok]5.获取蓝牙所有服务成功！")
                },
                fail: function (err) {
                    reject(err)
                }
            })
        })
    }

    getBLEDeviceCharacteristics(deviceId, serviceId) {
        return new Promise((reslove, reject) => {
            wx.getBLEDeviceCharacteristics({
                deviceId: deviceId,
                serviceId: serviceId,
                success: (res) => {
                    for (let j = 0; j < res.characteristics.length; j++) {
                        let item = res.characteristics[j]

                        if (item.properties.write) {
                            this.writeInfo.CharacteristicsId = item.uuid;
                        }

                        if (item.properties.notify || item.properties.indicate) {
                            this.connectInfo.CharacteristicsId = item.uuid
                        }
                    }
                    console.log("%c拿到DeviceCharacteristic", res, "color:red");
                    console.log(res);

                    reslove("[ok]7.获取蓝牙下该服务的特征成功！")
                },
                fail(err) {
                    reject("[error]7.获取该服务的特征失败！")
                }
            })
        })
    }

    BLE_notifyAndlisten() {
        return new Promise((reslove, reject) => {
            wx.getBLEDeviceCharacteristics
            wx.notifyBLECharacteristicValueChange({
                characteristicId: this.connectInfo.CharacteristicsId,
                deviceId: this.connectInfo.deviceId,
                serviceId: this.connectInfo.serviceId,
                state: true,
                success: (res) => {
                    reslove("[ok]8. notify 启动成功")
                    wx.showToast({
                        title: '连接成功！',
                        icon: 'success',
                        duration: 2000
                    })
                },
                fail: function (err) {
                    reject(err)
                }
            })
        })
    }

    /**
     * 发送数据
     * @param {*} order 16进制的指令
     */
    sendMsg(order) {
        if (this.isSending) {
            console.log("此时未连接到蓝牙或正在发送中，无法进入 sendMsg 函数")
            return
        }
        this.isSending = true;
        let sendDatas = new Uint8Array(order.length);
        for (let i = 0; i < order.length; i++) {
            sendDatas[i] = order[i]
        }
        // console.log("进入 sendMsg 函数，看看buffer", sendDatas, order);
        // console.log({
        //     characteristicId: this.writeInfo.CharacteristicsId,
        //     deviceId: this.writeInfo.deviceId,
        //     serviceId: this.writeInfo.serviceId,
        // });


        wx.writeBLECharacteristicValue({
            characteristicId: this.writeInfo.CharacteristicsId,
            deviceId: this.writeInfo.deviceId,
            serviceId: this.writeInfo.serviceId,
            value: sendDatas.buffer,
            success: (res) => {
                console.log("[2][ok]3.sendMsg 发送指令成功");
                this.isSending = false;
            },
            fail: (err) => {
                console.log("[2][error]3.sendMsg 发送指令失败:", err);
                console.log(err);

                this.isSending = false;
                this.catchErr(err)
            }
        })
    }
    // 蓝牙连接 ~ end

    // 错误提示
    catchErr(err) {
        wx.showToast({
            title: err,
            icon: "error",
            duration: 3000
        })
        wx.closeBluetoothAdapter();
    }
}






class BluetoothApi extends BluetoothApiBase {

    /**
     * 监听搜索到的蓝牙设备，并进行过滤
     * @param fn 
     */
    onFilterDevices(fn: Function) {
        const filterDevices = devicesArr => {
            let newDevicesArr = [];
            devicesArr.forEach(device => {
                if (
                    !device.name ||
                    !device.localName ||
                    device.localName.toLowerCase().indexOf("tt") == -1 ||
                    device.advertisData.length == 0 ||
                    !device.advertisServiceUUIDs
                ) { }
                else {
                    // 对设备信息进行解密
                    newDevicesArr.push(decrypt.decryptDevice(device));
                }
            })
            return newDevicesArr
        }

        wx.openBluetoothAdapter().then(() => {
            return this.startBluetoothDevicesDiscovery()
        }).then(() => {
            wx.onBluetoothDeviceFound(({ devices }) => fn(filterDevices(devices)))
        })
    }

    offFilterDevices() {
        wx.offBluetoothDeviceFound()
    }

    /**
     * 连接蓝牙设备
     * @param deviceId 设备id
     */
    async connectToDevice(deviceId) {
        await this.createBLEConnection(deviceId);
        await this.getBLEDeviceServices(deviceId);
        await this.getBLEDeviceCharacteristics(deviceId, this.connectInfo.serviceId);
        await this.BLE_notifyAndlisten();
    }
}

export default new BluetoothApi();