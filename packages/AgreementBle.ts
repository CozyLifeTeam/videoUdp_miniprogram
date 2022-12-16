

// http://doc.doit/project-5/doc-11/
// cmd:0 查询设备信息
export function queryDevice() {
    const cmd = 0;
    const len = 4;
    const timestamp = timestampToHexIntArray()



    function timestampToHexIntArray() {
        let b = parseInt((new Date().getTime() / 1000).toString()).toString(16)
        let c = [1, 1, 1, 1]
        c[3] = parseInt(b.substring(0, 2), 16)
        c[2] = parseInt(b.substring(2, 4), 16)
        c[1] = parseInt(b.substring(4, 6), 16)
        c[0] = parseInt(b.substring(6, 8), 16)
        return c;
    }
}







// function 