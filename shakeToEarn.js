var shakeToEarn = {};

var common = require("./common.js");
var commonAction = require("./commonAction.js");

const browseTag = "摇一摇赚元宝浏览首页";   //不一定有，不能列入每日任务中

gotoShakeEarnCoins = function () {
    if (!commonAction.gotoCoinCenter()) {
        return null;
    }

    var shakeBtn = common.waitForText("text", "摇一摇赚元宝", true, 10);
    if (shakeBtn == null) {
        return null;
    }

    var clickRet = shakeBtn.parent().click();
    log("点击 摇一摇赚元宝: " + clickRet);
    if (clickRet == false) {
        return null;
    }

    //按钮"摇动手机，开始PK"
    var pkBtn = common.waitForText("text", "摇动手机，开始PK", true, 10);
    return pkBtn;
}

shakeToEarn.doShakeMainBrowse = function () {
    log("doShakeMainBrowse");
    // 我的-> 元宝中心-> 摇一摇赚元宝，先上划个半屏，看有没有浏览商品30秒，时有时无的，有的时候才做
    var nowDate = new Date().Format("yyyy-MM-dd");
    var done = common.safeGet(nowDate + ":" + browseTag);
    if (done != null) {
        log(browseTag + " 已做: " + done);
        return;
    }

    toast("doShakeMainBrowse");
    if (gotoShakeEarnCoins() == null) {
        commonAction.backToAppMainPage();
        return;
    }

    sleep(1000);
    log("往上划动半个屏幕: " + swipe(device.width / 2, device.height * 7 / 8, device.width / 2, device.height / 8, 1000));
    var walkTips = textContains("浏览页面").findOne(1000);
    if (walkTips != null) {
        log("等待 商品 浏览完成，60s超时");
        var ret = commonAction.scrollThrough("浏览页面", 60);
        if (ret) {
            common.safeSet(nowDate + ":" + browseTag, "done");
            toastLog("完成 " + browseTag);
        } else {
            toastLog("60s timeout");
        }
    } else {
        toastLog("没有 浏览页面");
    }

    commonAction.backToAppMainPage();
}

//摇一摇赚元宝周期任务
shakeToEarn.doShakeRoutineTasks = function () {
    log("doShakeRoutineTasks");
    // 我的-> 元宝中心-> 摇一摇赚元宝
    var pkBtn = gotoShakeEarnCoins();
    if (pkBtn == null) {
        commonAction.backToAppMainPage();
        return;
    }

    //赚次数按钮
    var earnPKNumBtn = pkBtn.parent().parent().child(1).child(0);
    for (;;) {
        var clickRet = earnPKNumBtn.click();
        log("点击 赚次数: " + clickRet);
        if (clickRet == false) {
            commonAction.backToAppMainPage();
            return;
        }
        sleep(1000);

        var taskDetails = common.waitForText("text", "得次数", true, 10);
        if (taskDetails == null) {
            commonAction.backToAppMainPage();
            return;
        }

        for (;;) {
            var browseTaskList = [];    //浏览任务列表，滑动浏览完成后返回
            var searchTaskList = [];    //搜索任务列表，搜索后返回
            var watchTaskList = [];     //观看任务列表，需要多次折返
            var validTaskNames = [];
            var totalTasks = packageName(common.destPackageName).text("得次数").find();
            var validTasks = packageName(common.destPackageName).text("得次数").visibleToUser(true).find();

            validTasks.forEach(function (tv) {
                var taskItem = tv.parent();
                var title = taskItem.child(0).text();   //任务名称在第一个
                var btn = taskItem.child(taskItem.childCount() - 2);    //按钮在倒数第二个
                if (btn.bounds().height() > 50) {   //有的系统visibleToUser(true)有没有返回的个数都一样，用高度隐藏了
                    validTaskNames.push(title);
                }
            });
            toastLog("任务数: " + totalTasks.length + ", 可见: " + validTaskNames.length + ", " + validTaskNames);

            if (totalTasks.length == 0) {
                captureScreen("/sdcard/Download/" + (new Date().Format("yyyy-MM-dd HH:mm:ss")) + ".png");
                commonAction.backToAppMainPage();
                return;
            }

            var canWatch = common.canWatch();
            log("canWatch: " + canWatch);
            totalTasks.forEach(function(tv) {
                var taskItem = tv.parent();
                var title = taskItem.child(0).text();   //任务名称在第一个
                var btn = taskItem.child(taskItem.childCount() - 2);    //按钮在倒数第二个
                if (/去完成|去浏览|去观看/.test(btn.text()) && 
                    title.indexOf("邀请") == -1 && 
                    title.indexOf("领红包") == -1 && 
                    title.indexOf("领水果") == -1) {
                    var obj = {};
                    obj.Title = title;
                    obj.BtnName = btn.text();
                    obj.Button = btn;
                    if (obj.Title.indexOf("浏览") != -1) {
                        browseTaskList.push(obj);
                    } else if (obj.Title.indexOf("搜索") != -1) {
                        searchTaskList.push(obj);
                    } else if ((obj.Title.indexOf("直播") != -1 || obj.Title.indexOf("视频") != -1 || obj.Title.indexOf("分钟") != -1) && canWatch) {
                        watchTaskList.push(obj);
                    }
                    log("未完成任务" + (browseTaskList.length + searchTaskList.length + watchTaskList.length) + ": " + obj.Title + ", " + obj.BtnName + ", (" + obj.Button.bounds().centerX() + ", " + obj.Button.bounds().centerY() + "), " + obj.Button.bounds().height());
                } else {
                    log("跳过任务: " + title + ", " + btn.text() + ", (" + btn.bounds().centerX() + ", " + btn.bounds().centerY() + "), " + btn.bounds().height());
                }
            });

            var uncompleteTaskNum = browseTaskList.length + searchTaskList.length + watchTaskList.length;
            log("未完成任务数: " + uncompleteTaskNum);
            if (uncompleteTaskNum == 0) {
                commonAction.backToAppMainPage();
                return;
            }

            browseTaskList = common.filterTaskList(browseTaskList, validTaskNames)
            if (commonAction.doBrowseTasks(browseTaskList)) {
                //等待成功提示消失
                sleep(3000);
                break;
            }

            searchTaskList = common.filterTaskList(searchTaskList, validTaskNames)
            if (commonAction.doSearchTasks(searchTaskList)) {
                //等待成功提示消失
                sleep(3000);
                break;
            }

            watchTaskList = common.filterTaskList(watchTaskList, validTaskNames)
            if (commonAction.doWatchTasks(watchTaskList)) {
                //等待成功提示消失
                sleep(3000);
                break;
            }
        }
    }
}

module.exports = shakeToEarn;