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
collectSteps = function (walkBtn) {
    // 不管三七二十一，点一下能量饮料
    log("点击 能量饮料: " + click(walkBtn.bounds().width(), walkBtn.bounds().centerY()));
    // 等待提示消失
    sleep(5000);

    common.safeSet(common.lastWalkToEarnCollectTag, Math.floor(new Date().getTime() / 1000));

    //出发按钮为其父节点的第三个控件
    var objs = [];
    common.queryList(walkBtn.parent(), 0, objs);
    if (objs.length == 3) {
        log(objs[0].text() + ": " + objs[1].text());
        if (parseInt(objs[1].text()) > 0) {
            log("点击 出发: " + click(walkBtn.bounds().centerX(), walkBtn.bounds().centerY()));
            sleep(1000);
        }
    }    

    //如果弹提示框了，点关闭
    var getBtn = textMatches(/去领步数/).findOne(1000);
    if (getBtn != null) {
        var objs = [];
        common.queryList(getBtn.parent().parent(), 0, objs);
        log("遇" + getBtn.text() + " 提示，点击 关闭: " + click(objs[1].bounds().centerX(), objs[1].bounds().centerY()));
        sleep(1000);
    }

    //领飘在上面的元宝
    var tocollectCoins = textMatches(/\d+元宝\d+步/).find();
    for (var i = 0; i < tocollectCoins.length; i++) {
        log("点击 " + tocollectCoins[i].text() + ": " + click(tocollectCoins[i].bounds().centerX(), tocollectCoins[i].bounds().centerY()));
        var tips = textContains("成功领取元宝").findOne(1000);
        if (tips != null) {
            log("遇 成功领取元宝 提示，点击 关闭: " + click(tips.bounds().right, tips.bounds().top - tips.bounds().height()));
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
        commonAction.backTaoliveMainPage();
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

    commonAction.backTaoliveMainPage();
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
        commonAction.backTaoliveMainPage();
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

    commonAction.backTaoliveMainPage();
}

//走路赚元宝周期任务
walkToEarn.doWalkRoutineTasks = function () {
    toastLog("doWalkRoutineTasks");
    // 我的-> 元宝中心-> 走路赚元宝
    // 出发按钮
    var walkBtn = gotoWalkEarnCoins();
    if (walkBtn == null) {
        commonAction.backTaoliveMainPage();
        return;
    }

    collectSteps(walkBtn);

    //赚步数按钮坐标
    var earnStepsBtnX = walkBtn.bounds().centerX() + walkBtn.bounds().width() * 2;
    var earnStepsBtnY = walkBtn.bounds().centerY();
    for (;;) {
        clickRet = click(earnStepsBtnX, earnStepsBtnY);
        log("点击 赚步数(" + earnStepsBtnX + ", " + earnStepsBtnY + "): " + clickRet);
        if (clickRet == false) {
            commonAction.backTaoliveMainPage();
            return;
        }

        walkBtn = common.waitForText("text", "得步数", true, 10);
        if (walkBtn == null) {
            commonAction.backTaoliveMainPage();
            return;
        }

        var browseTaskList = [];    //浏览任务列表，滑动浏览完成后返回
        var searchTaskList = [];    //搜索任务列表，搜索后返回
        var watchTaskList = [];     //观看任务列表，需要多次折返
        var validTaskNames = [];
        var totalTasks = packageName(common.taolivePackageName).text("得步数").find();
        var validTasks = packageName(common.taolivePackageName).text("得步数").visibleToUser(true).find();

        for (var i = 0; i < validTasks.length; i++) {
            var objs = [];
            common.queryList(validTasks[i].parent(), 0, objs);
            if (objs.length == 7 && objs[5].bounds().height() > 50 || objs.length == 6 && objs[4].bounds().height() > 50) {
                validTaskNames.push(objs[0].text());
            }
        }
        toastLog("任务数: " + totalTasks.length + ", 可见: " + validTaskNames.length + ", " + validTaskNames);

        if (totalTasks.length == 0) {
            captureScreen("/sdcard/Download/" + (new Date().Format("yyyy-MM-dd HH:mm:ss")) + ".png");
            break;
        }

        totalTasks.forEach(function(tv) {
            var objs = [];
            var title = "";
            var btn = null;
            common.queryList(tv.parent(), 0, objs);
            title = objs[0].text();
            if (objs.length == 7) {
                btn = objs[5];
            } else if (objs.length == 6) {
                btn = objs[4];
            } else {
                for (var k = 0;k < objs.length; k++) {
                    log("第" + k + "个子控件" + objs[k]);
                }
            }
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
                    } else {
                        watchTaskList.push(obj);
                    }
                    log("未完成任务" + (browseTaskList.length + searchTaskList.length + watchTaskList.length) + ": " + obj.Title + ", " + obj.BtnName + ", (" + obj.Button.bounds().centerX() + ", " + obj.Button.bounds().centerY() + ")");
                } else {
                    log("跳过任务: " + title + ", " + btn.text() + ", (" + btn.bounds().centerX() + ", " + btn.bounds().centerY() + ")");
                }
            }
        });

        if (browseTaskList.length + searchTaskList.length + watchTaskList.length == 0) {
            break;
        }

        browseTaskList = common.filterTaskList(browseTaskList, validTaskNames)
        if (commonAction.doBrowseTasks(browseTaskList)) {
            walkBtn = common.waitForText("text", "出发", true, 10);
            if (walkBtn == null) {
                break;
            }
            //等待成功提示消失
            sleep(3000);
            collectSteps(walkBtn);
            continue;
        }

        searchTaskList = common.filterTaskList(searchTaskList, validTaskNames)
        if (commonAction.doSearchTasks(searchTaskList)) {
            walkBtn = common.waitForText("text", "出发", true, 10);
            if (walkBtn == null) {
                break;
            }
            //等待成功提示消失
            sleep(3000);
            collectSteps(walkBtn);
            continue;
        }

        watchTaskList = common.filterTaskList(watchTaskList, validTaskNames)
        var lastWorkToEarnCollectTimestamp = common.safeGet(common.lastWorkToEarnCollectTag);
        log("上次打工赚元宝采集时间戳: " + common.timestampToTime(lastWorkToEarnCollectTimestamp * 1000) + ", watchTaskList: " + watchTaskList.length);
        if (watchTaskList.length > 0 && new Date().getTime() / 1000 - lastWorkToEarnCollectTimestamp > common.lastCollectTimeout) {
            log("暂停观看视频任务，先去 打工赚元宝 领体力");
            break;
        }
        if (commonAction.doWatchTasks(watchTaskList)) {
            walkBtn = common.waitForText("text", "出发", true, 10);
            if (walkBtn == null) {
                break;
            }
            //等待成功提示消失
            sleep(3000);
            collectSteps(walkBtn);
            continue;
        }
    }

    commonAction.backTaoliveMainPage();
}

module.exports = walkToEarn;