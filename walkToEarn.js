var walkToEarn = {};

var common = require("./common.js");
var commonAction = require("./commonAction.js");

const browseTag = "走路赚元宝浏览首页";
const streetTag = "走路赚元宝浏览街区";

walkToEarn.dailyJobs = [];
walkToEarn.dailyJobs.push(browseTag);
walkToEarn.dailyJobs.push(streetTag);

gotoWalkEarnCoins = function () {
    var walkBtn = null;

    var urgentTime = common.checkAuditTime("14:00", "24:00");
    var nowDate = new Date().Format("yyyy-MM-dd");
    var permitted = common.safeGet(nowDate + ":" + common.walkToEarnPermissionTag);
    log("permitted: " + permitted + ", [14:00~24:00]: " + urgentTime);
    if (permitted == null) {
        log(common.walkToEarnPermissionTag + " : " + permitted);
        if (urgentTime) {
            //15点后还拿不到正常收益就强行进入走路赚元宝，能量饮料领取完需要7个多小时
            common.grantWalkToEarnPermission();
        } else {
            return walkBtn;
        }
    }

    if (!commonAction.gotoCoinCenter()) {
        return walkBtn;
    }

    walkBtn = common.waitForText("text", "走路赚元宝", true, 10);
    if (walkBtn == null) {
        return walkBtn;
    }

    var clickRet = click(walkBtn.bounds().centerX(), walkBtn.bounds().centerY() - walkBtn.bounds().height() * 3);
    log("点击 走路赚元宝: " + clickRet);
    if (clickRet == false) {
        return walkBtn;
    }

    walkBtn = common.waitForText("text", "出发", true, 10);
    if (walkBtn == null) {
        return walkBtn;
    }
    return walkBtn;
}

//喝能量饮料、点出发收集步数、收集飘在鸭子头顶上的元宝
//能量饮料：
//15秒      50步
//30秒      75步
//1分钟     100步
//2分钟     150步
//3分钟     200步
//4分钟     250步
//5分钟     300步
//10分钟    350步
//15分钟    400步
//20分钟    450步
//30分钟    500步
//2小时     1000步
//4小时     1250步
collectSteps = function () {
    //出发按钮
    var walkBtn = text("出发").findOne(1000);
    if (walkBtn == null) {
        return;
    }

    sleep(1000);
    //可用步数
    var stepsTips = parseInt(walkBtn.parent().child(1).text());
    log("可用步数: " + stepsTips);

    //能量饮料、出发、赚步数的父节点
    var threeBtnsBar = walkBtn.parent().parent().parent();
    var energyBtn = threeBtnsBar.child(0);
    var startBtn = threeBtnsBar.child(1).child(0);
    var earnBtn = threeBtnsBar.child(2);
    var energyLeftTime = energyBtn.child(1);
    var energySteps = "0";
    if (energyLeftTime.text() != "明日再来") {
        energySteps = energyBtn.child(2).text();
    }

    log("能量饮料剩余时间: " + energyLeftTime.text() + ", 可领取步数: " + energySteps);
    if (energyLeftTime.text() == "领取") {
        log("点击 能量饮料: " + energyBtn.click());
        // 等待提示消失
        sleep(5000);
        stepsTips = parseInt(walkBtn.parent().child(1).text());
        log("领取能量饮料后可用步数: " + walkBtn.parent().child(1).text());
    }

    //根据能量饮料剩余时间计算临近的下次检查时间
    energyLeftTime = energyBtn.child(1);
    log("下次能量饮料剩余时间: " + energyLeftTime.text());
    var curDate = new Date().Format("yyyy/MM/dd");
    var newNextWalkCheckTimestamp = new Date(curDate + " 24:00:00").getTime();
    if (/\d+:\d+:\d+/.test(energyLeftTime.text())) {
        var HHmmss = energyLeftTime.text().match(/\d+/g);
        newNextWalkCheckTimestamp = new Date().getTime() + (Number(HHmmss[0]) * 3600 + Number(HHmmss[1]) * 60 + Number(HHmmss[2])) * 1000;
    }
    common.safeSet(common.nextWalkCheckTimestampTag, newNextWalkCheckTimestamp);
    log(common.nextWalkCheckTimestampTag + " 设置为: " + common.timestampToTime(newNextWalkCheckTimestamp));

    //可用步数不为零才点出发
    if (stepsTips > 0) {
        log("点击 出发: " + startBtn.click());
        //如果弹提示框了，点关闭
        var getStepsTips = textMatches(/去领步数/).findOne(5000);
        if (getStepsTips != null) {
            var dlgCloseBtn = getStepsTips.parent().parent().child(1);
            log("遇" + getStepsTips.text() + " 提示，点击 关闭: " + dlgCloseBtn.click());
            sleep(1000);
        }
    }

    //根据当前步数领飘在上面的元宝
    var curSteps = textMatches(/当前步数\d+/).findOne(1000);
    if (curSteps == null) {
        return;
    }

    log(curSteps.text());
    var curStepNum = parseInt(curSteps.text().match(/\d+/));
    var tocollectCoins = textMatches(/\d+元宝\d+步/).find();
    var validCoins = [];
    tocollectCoins.forEach(function (tv) {
        var canGetSteps = parseInt(tv.text().match(/\d+/g)[1]);
        //当前步数不小于飘在空中的步数才去领
        if (curStepNum >= canGetSteps) {
            validCoins.push(tv);
        } else {
            log("未达条件: " + tv.text());
        }
    });

    if (validCoins.length > 0) {
        for (var i = 0; i < validCoins.length; i++) {
            log("点击 " + validCoins[i].text() + ": " + validCoins[i].click());
        }

        var tips = textContains("成功领取元宝").findOne(5000);
        if (tips != null) {
            var dlgCloseBtn = tips.parent().parent().child(1);
            log("遇 成功领取元宝 提示，点击 关闭: " + click(dlgCloseBtn.bounds().centerX(), dlgCloseBtn.bounds().centerY()));
            sleep(1000);
        }
    }
}

walkToEarn.doWalkMainBrowse = function () {
    log("doWalkMainBrowse");
    // 我的-> 元宝中心-> 走路赚元宝，先上划个半屏，看有没有浏览商品30秒 +300步，有就做，没有拉倒
    var nowDate = new Date().Format("yyyy-MM-dd");
    var done = common.safeGet(nowDate + ":" + browseTag);
    if (done != null) {
        log(browseTag + " 已做: " + done);
        return;
    }

    toast("doWalkMainBrowse");
    if (gotoWalkEarnCoins() == null) {
        commonAction.backToAppMainPage();
        return;
    }

    log("往上划动半个屏幕: " + swipe(device.width / 2, device.height * 7 / 8, device.width / 2, device.height / 8, 1000));
    var walkTips = textContains("浏览商品").findOne(1000);
    if (walkTips != null) {
        log("等待 商品 浏览完成，360s超时");
        var ret = commonAction.scrollThrough("浏览商品", 360);
        if (ret) {
            common.safeSet(nowDate + ":" + browseTag, "done");
            toastLog("完成 " + browseTag);
        } else {
            toastLog("360s timeout");
        }
    } else {
        common.safeSet(nowDate + ":" + browseTag, "none");
        toastLog("无 " + browseTag);
    }

    commonAction.backToAppMainPage();
}

walkToEarn.doWalkStreetBrowse = function () {
    log("doWalkStreetBrowse");
    // 我的-> 元宝中心-> 走路赚元宝，如果混到赚步数列表，点击时会点到任务列表的表头从而关闭了任务列表，故作特殊处理
    var nowDate = new Date().Format("yyyy-MM-dd");
    var done = common.safeGet(nowDate + ":" + streetTag);
    if (done != null) {
        log(streetTag + " 已做: " + done);
        return;
    }

    toast("doWalkStreetBrowse");
    if (gotoWalkEarnCoins() == null) {
        commonAction.backToAppMainPage();
        return;
    }

    var browseTaskList = [];
    var streetTips = textContains("浏览街区").findOne(1000);
    if (streetTips != null && streetTips.bounds().height() > 10) {
        var obj = {};
        obj.Title = streetTips.text();
        obj.BtnName = "去完成";
        obj.Button = streetTips;
        browseTaskList.push(obj);
        if (commonAction.doBrowseTasks(browseTaskList)) {
            common.safeSet(nowDate + ":" + streetTag, "done");
            toastLog("完成 " + streetTag);
        }
    } else {
        common.safeSet(nowDate + ":" + streetTag, "none");
        toastLog("无 " + streetTag);
    }

    commonAction.backToAppMainPage();
}

//走路赚元宝周期任务
walkToEarn.doWalkRoutineTasks = function () {
    toastLog("doWalkRoutineTasks");
    // 我的-> 元宝中心-> 走路赚元宝
    // 出发按钮
    var walkBtn = gotoWalkEarnCoins();
    if (walkBtn == null) {
        commonAction.backToAppMainPage();
        return;
    }

    collectSteps();

    //赚步数按钮坐标
    var threeBtnsBar = walkBtn.parent().parent().parent();
    var earnBtn = threeBtnsBar.child(2);
    for (;;) {
        clickRet = earnBtn.click();
        log("点击 赚步数: " + clickRet);
        if (clickRet == false) {
            commonAction.backToAppMainPage();
            return;
        }

        walkBtn = common.waitForText("text", "得步数", true, 10);
        if (walkBtn == null) {
            commonAction.backToAppMainPage();
            return;
        }

        for (;;) {
            var shortBrowseTaskList = [];   //短时浏览任务列表，浏览完成后返回
            var browseTaskList = [];    //浏览任务列表，滑动浏览完成后返回
            var searchTaskList = [];    //搜索任务列表，搜索后返回
            var watchTaskList = [];     //观看任务列表，需要多次折返
            var validTaskNames = [];
            var totalTasks = packageName(common.destPackageName).text("得步数").find();
            var validTasks = packageName(common.destPackageName).text("得步数").visibleToUser(true).find();

            for (var i = 0; i < validTasks.length; i++) {
                var taskItem = validTasks[i].parent();
                var btn = taskItem.child(taskItem.childCount() - 2);
                if (btn.bounds().height() > 50) {
                    validTaskNames.push(taskItem.child(0).text());
                }
            }
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
                var title = taskItem.child(0).text();
                var btn = taskItem.child(taskItem.childCount() - 2);
                if (btn != null) {
                    if (/去完成|去浏览/.test(btn.text()) && title.indexOf("邀请") == -1 && title.indexOf("支付宝") == -1) {
                        var obj = {};
                        obj.Title = title;
                        obj.BtnName = btn.text();
                        obj.Button = btn;
                        if (obj.Title.indexOf("浏览") != -1) {
                            browseTaskList.push(obj);
                        } else if (obj.Title.indexOf("搜索") != -1) {
                            searchTaskList.push(obj);
                        } else if (obj.Title.indexOf("直播") != -1 || obj.Title.indexOf("视频") != -1 || obj.Title.indexOf("分钟") != -1) {
                            if (canWatch) {
                                watchTaskList.push(obj);
                            }
                        } else {
                            shortBrowseTaskList.push(obj);
                        }
                        log("未完成任务" + (shortBrowseTaskList.length + browseTaskList.length + searchTaskList.length + watchTaskList.length) + ": " + obj.Title + ", " + obj.BtnName + ", (" + obj.Button.bounds().centerX() + ", " + obj.Button.bounds().centerY() + "), " + obj.Button.bounds().height());
                    } else {
                        log("跳过任务: " + title + ", " + btn.text() + ", (" + btn.bounds().centerX() + ", " + btn.bounds().centerY() + "), " + btn.bounds().height());
                    }
                }
            });

            var uncompleteTaskNum = shortBrowseTaskList.length + browseTaskList.length + searchTaskList.length + watchTaskList.length;
            log("未完成任务数: " + uncompleteTaskNum);
            if (uncompleteTaskNum == 0) {
                commonAction.backToAppMainPage();
                return;
            }

            shortBrowseTaskList = common.filterTaskList(shortBrowseTaskList, validTaskNames)
            if (commonAction.doShortBrowseTasks(shortBrowseTaskList)) {
                walkBtn = common.waitForText("text", "出发", true, 10);
                if (walkBtn == null) {
                    commonAction.backToAppMainPage();
                    return;
                }
                //等待成功提示消失
                sleep(3000);
                collectSteps();
                break;
            }

            browseTaskList = common.filterTaskList(browseTaskList, validTaskNames)
            if (commonAction.doBrowseTasks(browseTaskList)) {
                walkBtn = common.waitForText("text", "出发", true, 10);
                if (walkBtn == null) {
                    commonAction.backToAppMainPage();
                    return;
                }
                //等待成功提示消失
                sleep(3000);
                collectSteps();
                break;
            }

            searchTaskList = common.filterTaskList(searchTaskList, validTaskNames)
            if (commonAction.doSearchTasks(searchTaskList)) {
                walkBtn = common.waitForText("text", "出发", true, 10);
                if (walkBtn == null) {
                    commonAction.backToAppMainPage();
                    return;
                }
                //等待成功提示消失
                sleep(3000);
                collectSteps();
                break;
            }

            watchTaskList = common.filterTaskList(watchTaskList, validTaskNames)
            if (commonAction.doWatchTasks(watchTaskList)) {
                walkBtn = common.waitForText("text", "出发", true, 10);
                if (walkBtn == null) {
                    commonAction.backToAppMainPage();
                    return;
                }
                //等待成功提示消失
                sleep(3000);
                collectSteps();
                break;
            }

            log("上划任务列表: " + swipe(device.width / 5, device.height * 13 / 16, device.width / 5, device.height * 11 / 16, 200));
        }
    }
}

module.exports = walkToEarn;