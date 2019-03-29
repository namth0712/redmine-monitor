/** @param {jQuery} $ jQuery Object */
!function ($, window, document) {
    let listNoti = {};

    const compare = (arr1, arr2) => {
        if (!arr1 || !arr2) return
        let result;
        Array.prototype.forEach.call(arr1, e1 => {
            Array.prototype.forEach.call(arr2, e2 => {
                if (e1.length > 1 && e2.length) {
                    result = compare(e1, e2);
                } else if (e1 !== e2) {
                    result = false
                } else {
                    result = true
                }
            });
        })
        return result;
    }
    const checkData = (alarm, result) => {
        let key = alarm.name.replace('alarm-', '');
        if (result.urlData[key] && typeof (result.urlData[key]) !== 'undefined') {
            let issueData = result.urlData[key];
            let items = issueData.items || {};
            $.get(result.urlData[key], (data) => {
                let html = $(data), listIssues, issues;
                listIssues = html.find('.list.issues');
                issues = listIssues.find('tr.issue');

                let tasks = {}, issueIds = [], changedIssues = [], newIssues = [], removedIssues = {};

                issues.each((index, el) => {
                    let issue = $(el), assigned = '', author = '', assignedLink = '',
                        updatedOn = '', description = '', issueId, status;
                    issueId = issue.find('.id > a').text();
                    if (!issueId) {
                        return;
                    }
                    status = issue.find('.status').html();
                    let title = issue.find('.subject > a').text();
                    if (issue.find('.assigned_to > a').length) {
                        assigned = issue.find('.assigned_to > a').text();
                        assignedLink = issue.find('.assigned_to').html();
                    }
                    if (issue.find('.author > a').length) {
                        authorLink = issue.find('.author').html();
                    }
                    if (issue.find('.updated_on').length) {
                        updatedOn = issue.find('.updated_on').html();
                    }
                    if (issue.next().find('.description .wiki').length) {
                        description = issue.next().find('.description .wiki').html();
                    }
                    tasks[issueId] = {
                        issueId,
                        status,
                        assigned,
                        updatedOn,
                    };
                    issueIds.push(issueId);
                    if (items[issueId]) {
                        if (
                            items[issueId].status != tasks[issueId].status ||
                            items[issueId].assigned != tasks[issueId].assigned ||
                            items[issueId].updatedOn != tasks[issueId].updatedOn
                        ) {
                            changedIssues.push({
                                ...tasks[issueId],
                                issueId,
                                title
                            });
                        }
                        delete items[issueId];
                    } else {
                        newIssues.push({
                            ...tasks[issueId],
                            issueId,
                            title
                        });
                    }
                });
                removedIssues = { ...items };
                if (changedIssues.length || newIssues.length || removedIssues.length) {
                    result.urlData[key].issueIds = issueIds;
                    result.urlData[key].items = tasks;
                    result.urlData[key].itemCount = Object.keys(tasks).length;

                    chrome.storage.local.set({ 'urlData': result.urlData });
                    chrome.notifications.getAll(notifications => {
                        for (let notificationId in notifications) {
                            //chrome.notifications.clear(notificationId);
                        }
                    });
                    let messages = [];

                    if (newIssues.length === 1) {
                        messages.push(`New issue #${newIssues[0].issueId}`);
                        if (!Object.keys(removedIssues).length) {
                            messages.push(`${newIssues[0].title.substring(0, 35)}`);
                        }
                    } else if (newIssues.length) {
                        messages.push(`New ${newIssues.length} issues`);
                        if (!Object.keys(removedIssues).length) {
                            let newIssueIds = [];
                            newIssues.map((issue) => {
                                newIssueIds.push(`#${issue.issueId}`)
                            });
                            messages.push(newIssueIds.join(' '));
                        }
                    }

                    if (changedIssues.length === 1) {
                        messages.push(`Updated issue #${changedIssues[0].issueId}`);
                        if (!Object.keys(removedIssues).length) {
                            messages.push(`${removedIssues[0].title.substring(0, 35)}`);
                        }
                    } else if (changedIssues.length) {
                        messages.push(`Updated ${changedIssues.length} issues`);
                        if (!Object.keys(removedIssues).length) {
                            let changeIssueIds = [];
                            changedIssues.map((issue) => {
                                changeIssueIds.push(`#${issue.issueId}`)
                            });
                            messages.push(changeIssueIds.join(' '));
                        }
                    }

                    if (Object.keys(removedIssues).length) {
                        messages.push(`Removed ${Object.keys(removedIssues).length} issues`);
                        let removedIssueIds = [];
                        for (let key in removedIssues) {
                            removedIssueIds.push(`#${key}`)
                        }
                        messages.push(removedIssueIds.join(' '));
                    }
                    let message = messages.join("\n");
                    chrome.notifications.create({
                        iconUrl: "assets/icons/icon-256.png",
                        title: "Issues update at " + result.urlData[key].title,
                        type: "basic",
                        message: message
                    }, (notificationId) => {
                        listNoti[notificationId] = result.urlData[key];
                    });
                }
            });
        }
    };
    chrome.alarms.onAlarm.addListener(alarm => {
        //console.log('===alarm===', alarm.name);
        chrome.storage.local.get('urlData', function (result) {
            if (result.urlData) {
                checkData(alarm, result);
            }
        });
    });

    chrome.notifications.onClicked.addListener(notificationId => {
        if (listNoti[notificationId]) {
            chrome.tabs.create({ url: listNoti[notificationId].url });
        }
    });
}
    (jQuery, window, document);