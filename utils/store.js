//全局数据共享交互中心  组件与全局可相互设置
let store={
  pages:{},
  curPage:'',
  lazyData:{},
};

let pages=[] //{name:'index',page:that}

var freeData={}

let pageObj={
  name:'index',
  that:'that',
  type:'1',
}

function setCurPage(that){
  store.curPage=that
}

function getCurPage(){
  return store.curPage
}

function setPage(key,that){
  store.pages[key]=that
}

function getPage(key){
  return store.pages[key]
}

//pages=['index','show']
function pagesSetDate(pages,data){
  for(let i=0;i<pages.length;i++){
    store.pages[pages[i]].setData(data)
  }
}

//全局更新数据
function allUpDate(data){
  store.pages.keys().forEach(key => {
    store.pages[key].setData(data)
  });

}



module.exports = {
  setPage,
  getPage,
  pagesSetDate,
  allUpDate,
  setCurPage,
  getCurPage,
  freeData
}