var common = {};

common.appName = "TaoliveHouseKeeper";
common.destAppName = "点淘";
common.taolivePackageName = "com.taobao.live";

//收益正常才允许每日首次进入，否则元宝只有1/10，首次进入后后面随意进出
common.walkToEarnPermissionTag = "走路赚元宝准入";

//走路与打工的视频直播观看任务需要在签到、睡觉、成功打工、摇一摇视频直播任务之后才能执行
//Min(下一次走路赚元宝领能量饮料, 下一次打工赚元宝领体力, 下一次走路赚元宝准入检查时间戳, 下一个整点检查时间戳)
common.nextCheckTimestampTag = "下一次检查时间戳";  //带毫秒

var storagelock = threads.lock();
var localStorages = storages.create(common.appName+":global");

common.timestampToTime = function (timestamp) {
    var date = new Date(timestamp);//时间戳为10位需*1000，时间戳为13位的话不需乘1000
    var Y = date.getFullYear() + '-';
    var M = (date.getMonth()+1 < 10 ? '0'+(date.getMonth()+1) : date.getMonth()+1) + '-';
    var D = (date.getDate() < 10 ? '0' + date.getDate() : date.getDate()) + ' ';
    var h = (date.getHours() < 10 ? '0' + date.getHours() : date.getHours()) + ':';
    var m = (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes()) + ':';
    var s = date.getSeconds() < 10 ? '0' + date.getSeconds() : date.getSeconds();
    return Y+M+D+h+m+s;
}

common.safeGet = function (key) {
    var flag = false;
    try{
        flag = storagelock.tryLock();
        var data = null;
        if (flag) {
            var exist = localStorages.contains(key);
            if (exist) {
                data = localStorages.get(key);
            }
        }
        return data;
    } finally {
        if (flag) {
            storagelock.unlock();
        }
    }
}

common.safeSet = function (key, stringValue) {
    var flag = false;
    try {
        flag = storagelock.tryLock();
        if (flag) {
            localStorages.put(key,stringValue);
        }
    } finally {
        if (flag) {
            storagelock.unlock();
        }
    }
}

//depth遍历深度，0为json的子一层
common.queryList = function (json, depth, arr) {
    for (var i = 0; i < json.childCount(); i++) {
        var sonList = json.child(i);
        if (sonList.childCount() == 0) {
            arr.push(json.child(i));
        } else {
            if (depth > 0) {
                queryList(sonList, depth - 1, arr);
            } else {
                arr.push(json.child(i));
            }
        }
    }
    return arr;
}

common.listAll = function () {
    sleep(3000);
    //var list = className("ListView").findOne();
    var list = className("FrameLayout").findOne();
    var arr=[]
    common.queryList(list, 255, arr);
    for(var k=0;k<arr.length;k++){
        log("第"+k+"个子控件"+arr[k]);
    }
}

common.waitForText = function (method, txt, visible, sec) {
    var obj = null;
    for (var i = 0; i < sec && obj == null; i++) {
        if (visible) {
            obj = eval(method + "(\"" + txt + "\").visibleToUser(true).findOne(1000)");
        } else {
            obj = eval(method + "(\"" + txt + "\").findOne(1000)");
        }
        if (obj == null) {
            log("等待 " + txt + " 出现");
        } else {
            if (visible) {
                if (obj.bounds().height() < 10) {
                    log("等待 " + txt + " 出现, height: " + obj.bounds().height());
                    obj = null;
                }
            }
        }
    }
    return obj;
}

common.waitForTextMatches = function (regex, visible, sec) {
    var obj = null;
    for (var i = 0; i < sec && obj == null; i++) {
        if (visible) {
            obj = eval("textMatches(" + regex + ").visibleToUser(true).findOne(1000)");
        } else {
            obj = eval("textMatches(" + regex + ").findOne(1000)");
        }
        if (obj == null) {
            log("等待 " + regex + " 出现");
        } else {
            if (visible) {
                if (obj.bounds().height() < 10) {
                    log("等待 " + regex + " 出现, height: " + obj.bounds().height());
                    obj = null;
                }
            }
        }
    }
    return obj;
}

//返回是否超时
common.waitDismiss = function (method, txt, sec) {
    // 等待离开"进入并关注"任务列表页面
    var obj = null;
    for (var i = 0; i < sec; i++) {
        obj = eval(method + "(\"" + txt + "\").findOne(1000)");
        if (obj == null) {
            log("等待 " + txt + " 消失");
            return false;
        }
    }
    return true;
}

common.filterTaskList = function (todoTasks, validTaskNames) {
    var ret = [];
    for (var i = 0; i < todoTasks.length; i++) {
        if (validTaskNames.indexOf(todoTasks[i].Title) != -1) {
            ret.push(todoTasks[i]);
        }
    }
    return ret;
}

common.grantWalkToEarnPermission = function () {
    var nowDate = new Date().Format("yyyy-MM-dd");
    var permitted = common.safeGet(nowDate + ":" + this.walkToEarnPermissionTag);
    if (permitted != null) {
        log(this.walkToEarnPermissionTag + " : " + permitted);
        return;
    }

    common.safeSet(nowDate + ":" + this.walkToEarnPermissionTag, true);
    log(this.walkToEarnPermissionTag + " : 允许进入");
}

module.exports = common;