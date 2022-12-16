


export type Device = {
    pid: string,
    mac: any,
    net_type: NetType,
    isBinded: IsBinded,
    icon?: string,
    device_model_name?: string
}

export enum NetType {
    WIFI,
    BLUETHOOTH,
    WIFIANDBLUETOOTH
}

export enum IsBinded {
    NOBINDED,
    YESBINDED
}