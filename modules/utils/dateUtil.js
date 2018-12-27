function getDate(){
    return new Date();
}

function getTime() {
	return new Date().toLocaleString();
}

function getDateFromText(riqi){
    let date;
    let currentDate = new Date();
    let currentTime = currentDate.getTime();
    let currenDay = currentDate.getDay();

    if(riqi.search('今天') !== -1){
        date = currentDate;
    }else if(riqi.search('明天') !== -1){
        date = new Date(currentTime + 24*60*60*1000)
    }else if(riqi.search('昨天') !== -1){
        date = new Date(currentTime - 24*60*60*1000)
    }else if(riqi.search('一') !== -1){
        date = new Date(currentTime + 24*60*60*1000 * (0 - (currenDay + 6) % 7))
    }else if(riqi.search('二') !== -1){
        date = new Date(currentTime + 24*60*60*1000 * (1 - (currenDay + 6) % 7))
    }else if(riqi.search('三') !== -1){
        date = new Date(currentTime + 24*60*60*1000 * (2 - (currenDay + 6) % 7))
    }else if(riqi.search('四') !== -1){
        date = new Date(currentTime + 24*60*60*1000 * (3 - (currenDay + 6) % 7))
    }else if(riqi.search('五') !== -1){
        date = new Date(currentTime + 24*60*60*1000 * (4 - (currenDay + 6) % 7))
    }else if(riqi.search('六') !== -1){
        date = new Date(currentTime + 24*60*60*1000 * (5 - (currenDay + 6) % 7))
    }else if(riqi.search('日') !== -1){
        date = new Date(currentTime + 24*60*60*1000 * (6 - (currenDay + 6) % 7))
    }else if(/(201[1-9]{5})/.exec(riqi)){
        date = /(201[1-9]{5})/.exec(riqi)[1];
    }else{
        date = currentDate;
    }

    return date;
};

Date.prototype.format = function(fmt) {
    var o = { 
       "M+" : this.getMonth()+1,                 //月份 
       "d+" : this.getDate(),                    //日 
       "h+" : this.getHours(),                   //小时 
       "m+" : this.getMinutes(),                 //分 
       "s+" : this.getSeconds(),                 //秒 
       "q+" : Math.floor((this.getMonth()+3)/3), //季度 
       "S"  : this.getMilliseconds()             //毫秒 
   }; 
   if(/(y+)/.test(fmt)) {
           fmt=fmt.replace(RegExp.$1, (this.getFullYear()+"").substr(4 - RegExp.$1.length)); 
   }
    for(var k in o) {
       if(new RegExp("("+ k +")").test(fmt)){
            fmt = fmt.replace(RegExp.$1, (RegExp.$1.length==1) ? (o[k]) : (("00"+ o[k]).substr((""+ o[k]).length)));
        }
    }
   return fmt; 
}


export default getDate;
export {
    getTime,
	getDateFromText
}
