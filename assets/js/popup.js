/** @param {jQuery} $ jQuery Object */
!function ($, window, document) {
    let popup = {
        urlData: false,
        init: () => {
            chrome.storage.local.get('urlData', function (result) {
                popup.loadData(result.urlData);
                /* $('#ctrl-url').val(result.url);
                 popup.url = result.url;
                 loadData(result.url)*/
            });

            chrome.alarms.getAll(alarms => {
                console.log('===alarms===', alarms);
            });
        },

        loadData: urlData => {
            if (!urlData) {
                return false;
            }
            for (let key in urlData) {
                let data = urlData[key];
                popup.addTab(key, data);
            }
            popup.urlData = urlData;
            $('#taskTabs a:first').tab('show');
        },

        addTab: (key, data) => {
            let taksTabs = $('#taskTabs');
            let taskContents = $('#taskContents');
            let title = data.title ? data.title : data.id;
            taksTabs.prepend(`
                <li class="nav-item">
                  <a class="nav-link" id="task-tab-`+ data.id + `" data-toggle="tab" href="#panel-` + data.id + `" role="tab" aria-controls="panel-` + data.id + `" aria-selected="true">` + title + `</a>
                </li>
            `);
            let tab = $(`
                <div class="tab-pane fade" id="panel-`+ data.id + `" data-id="` + data.id + `" data-key="` + key + `" role="tabpanel" aria-labelledby="task-tab-` + data.id + `">
                    <div class="link-header">
                        <a href="`+ data.url + `" class="view-link">` + data.url + `</a>
                        <span class="btn-config"><i class="fas fa-pencil-alt"></i></span>
                    </div>
                    <div class="config-panel">
                        <div class="form-group">
                            <label>Title</label>
                            <input type="text" class="form-control ctrl-title" placeholder="Title" value="`+ title + `">
                        </div>
                        <div class="form-group">
                            <label>Redmine page url</label>
                            <input type="text" class="form-control ctrl-url" placeholder="Enter redmine url" value="`+ data.url + `">
                        </div>
                        <div class="btn-list">
                            <a href="#" class="btn btn-primary updateBtn">Update</a>
                            <button type="button" class="btn btn-danger float-right removeTask">Remove</button>
                        </div>
                    </div>
                    <div class="form-group">
                      <span class="switch">
                        <input type="checkbox" checked="checked" class="switch switch-alarm" id="switch-alarm-`+ data.id + `">
                        <label for="switch-alarm-`+ data.id + `">Alarm</label>
                      </span>
                    </div>
                    <ul class="listTasks">
                        <li class="listHeader clearfix">
                            <div class="list-col list-col-icon">#</div>
                            <div class="list-col list-col-id">ID</div>
                            <div class="list-col list-col-assigned">Assigned</div>
                            <div class="list-col list-col-updated">Updated</div>
                            <div class="list-col list-col-subject">Subject</div>
                        </li>
                        <li class="loading">
                            <div class="fa-3x">
                              <i class="fas fa-spinner fa-pulse"></i>
                            </div>
                        </li>
                    </ul>
                </div>
            `);
            taskContents.prepend(tab);

            let alarmName = 'alarm-' + key;
            chrome.alarms.get(alarmName, alarm => {
                console.log(alarm);
                if (alarm) {
                    tab[0].getElementsByClassName("switch-alarm")[0].checked = true;
                } else {
                    tab[0].getElementsByClassName("switch-alarm")[0].checked = false;
                }
            });

            if (!data.fetchUrl) {
                let url = data.url;
                let cols = [
                    //'tracker',
                    'status',
                    //'priority',
                    'subject',
                    'assigned_to',
                    //'start_date',
                    //'due_date',
                    //'spent_hours',
                    //'done_ratio',
                    'created_on',
                    'updated_on',
                    'author',
                    //'project',
                    //'parent',
                    //'category',
                    //'fixed_version',
                    //'estimated_hours',
                    //'closed_on',
                    //'relations'
                ];
                let queryString = 'utf8=✓&set_filter=1';
                let newCols = cols.map(col => (encodeURIComponent('c[]') + '=' + col));
                queryString += '&' + (newCols.join('&'));// + '&group_by=&'+ encodeURIComponent('c[]') +'=description';
                queryString += '&per_page=100';
                if (url.indexOf('?') !== -1) {
                    url += '&' + queryString;
                } else {
                    url += '?' + queryString;
                }
                data.fetchUrl = url;
            }
            popup.loadTaskData(data.fetchUrl, (`panel-${data.id}`), key);
            tab.find('.switch-alarm').addClass('FOUND');
            tab.find('.switch-alarm').on('change', { key: key }, popup.toggleAlarm);

            tab.find('.removeTask').on('click', { key: key, id: data.id }, popup.removeTask);
            tab.find('.updateBtn').on('click', { key: key, id: data.id }, popup.addUpdateUrl);
            tab.find('.btn-config').on('click', popup.openConfig);
            tab.find('.view-link').on('click', (e) => {
                let el = $(e.target);
                if (el.attr('href')) {
                    e.preventDefault();
                    chrome.tabs.create({
                        url: el.attr('href')
                    });
                }
            });

            return `task-tab-${data.id}`;
        },

        openConfig: e => {
            e.preventDefault();
            let parent = e.target.closest('.tab-pane');
            if ($(parent).find('.config-panel').length) {
                if ($(parent).find('.config-panel').hasClass('show')) {
                    $(parent).find('.config-panel').removeClass('show')
                } else {
                    $(parent).find('.config-panel').addClass('show')
                }
            }
        },

        removeTab: id => {
            $('#panel-' + id).remove();
            $('#task-tab-' + id).remove();
            $('#taskTabs a:first').tab('show');
        },

        loadTaskData: (url, targetPanel, key) => {
            if (!url) {
                return;
            }
            $.get(url, (htmlString) => {
                let html = $(htmlString), listIssues, issues, listTasks;
                listIssues = html.find('.list.issues');
                issues = listIssues.find('tr.issue');

                let hostname = url;
                if (url.indexOf("http://") > -1) {
                    hostname = 'http://' + url.split('/')[2];
                } else if (url.indexOf("https://") > -1) {
                    hostname = 'https://' + url.split('/')[2];
                }
                else {
                    hostname = url.split('/')[0];
                }

                let tasks = {};
                let issueIds = [];

                listTasks = $('#' + targetPanel).find('.listTasks');
                listTasks.find('li:not(.listHeader)').remove();
                listTasks.attr('data-base-url', hostname);
                issues.each((index, el) => {
                    let issue = $(el), assigned = '', author = '', assignedLink = '',
                        updatedOn = '', authorLink = '', description = '', issueId, status;
                    issueId = issue.find('.id > a').text();
                    if (!issueId) {
                        return;
                    }
                    status = issue.find('.status').html();
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

                    let title = issue.find('.subject > a').text();
                    let task = $(`
                        <li class="listItem" data-href="`+ issue.find('.id > a').attr('href') + `">
                            <div class="item-detail clearfix">
                                <div class="list-col list-col-icon"><button class="btn btn-info"><i class="fas fa-angle-down"></i></button></div>
                                <div class="list-col list-col-id">
                                    <div class="author">`+ issue.find('.id').html() + `</div>
                                    <div class="assigned">${status}</div>
                                </div>
                                <div class="list-col list-col-assigned">
                                    <div class="assigned"> > ${assignedLink}</div>
                                    <div class="author paint">${authorLink}</div>
                                </div>
                                <div class="list-col list-col-updated">${updatedOn}</div>
                                <div class="list-col list-col-subject">`+ issue.find('.subject').html() + `</div>
                            </div>
                            <div class="item-content">${description}</div>
                        </li>
                    `);
                    listTasks.append(task);
                    tasks[issueId] = {
                        status,
                        assigned,
                        //title: title,
                        updatedOn,
                    };
                    issueIds.push(issueId);
                });
                if (!popup.urlData[key].title) {
                    var title = htmlString.match(/<title[^>]*>([^<]+)<\/title>/)[1];
                    title = title.replace(/^Issues\s-\s/gi, "");
                    console.log(title);
                    popup.urlData[key].title = title;
                    $('#task-tab-' + popup.urlData[key].id).text(title);
                    $('#' + targetPanel).find('input.ctrl-title').val(title);
                }

                popup.urlData[key].itemCount = Object.keys(tasks).length;
                popup.urlData[key].items = tasks;
                popup.urlData[key].issueIds = issueIds;
                //popup.urlData[key].fetchUrl = url;
                chrome.storage.local.set({ 'urlData': popup.urlData });

                listTasks.on('click', 'a', (e) => {
                    let el = $(e.target);
                    if (!el.is('a')) {
                        el = el.closest('a');
                    }
                    if (el.attr('href')) {
                        e.preventDefault();
                        let baseUrl = el.closest('.listTasks').attr('data-base-url');
                        openTab(el.attr('href'), baseUrl);
                    }
                });
                listTasks.on('click', '.btn-info', popup.loadIssueContent);
            });
        },

        loadIssueContent: e => {
            e.preventDefault();
            let el = $(e.target);
            if (el.closest('.listItem').length) {
                let listItem = el.closest('.listItem');
                if (listItem.hasClass('content-loaded')) {
                    listItem.toggleClass('show-content');
                    return;
                }
                let href = listItem.attr('data-href');
                let baseUrl = el.closest('.listTasks').attr('data-base-url');
                if ("http" !== href.substring(0, 4)) {
                    href = baseUrl + href;
                }
                if (!href) {
                    return;
                }
                listItem.addClass('content-loading');
                $.get(href, (data) => {
                    listItem.removeClass('content-loading');
                    let html = $(data), description = '', content;
                    html.find('img').each((index, img) => {
                        let imgTag = $(img),
                            imgSrc = imgTag.attr('src');
                        if ("http" !== imgSrc.substring(0, 4)) {
                            imgTag.attr('src', baseUrl + imgSrc);
                        }
                    });
                    if (html.find('.description .wiki').length) {
                        description = html.find('.description .wiki').html();
                    }
                    content = $(`
                        <div class="description">`+ description + `</div>
                    `);

                    if (html.find('#history').length) {
                        content.append('<h4 class="block-title">History</h4>');
                        let ulChange = $('<ul class="history"></ul>');
                        html.find('#history > div').each((index, history) => {
                            let change = $(history);
                            change.find('a[title="Quote"]').remove();
                            ulChange.append(`<li class="change-${change.attr('id')}">${change.html()}</li>`);
                        });
                        content.append(ulChange);
                    }
                    listItem.addClass('content-loaded');
                    listItem.find('.item-content').html(content).addClass('show');
                    listItem.addClass('show-content');
                });
            }
        },

        toggleAlarm: e => {
            let alarmName = 'alarm-' + e.data.key;
            chrome.alarms.get(alarmName, alarm => {
                if (alarm) {
                    popup.removeAlarm(e);
                } else {
                    popup.setAlarm(e);
                }
            });
        },

        setAlarm: e => {
            chrome.alarms.create('alarm-' + e.data.key, { when: 100, periodInMinutes: 1 });
        },

        removeAlarm: e => {
            chrome.alarms.clear('alarm-' + e.data.key);
        },

        removeTask: e => {
            e.preventDefault();
            console.log('===removeTask===', e);
            delete popup.urlData[e.data.key];
            chrome.storage.local.set({ 'urlData': popup.urlData });
            chrome.alarms.clear('alarm-' + e.data.key);

            popup.removeTab(e.data.id);
        },

        addUpdateUrl: (e) => {
            e.preventDefault();
            let parent = e.target.closest('.tab-pane'), title;
            let oldKey = parent.getAttribute('data-key');
            let oldId = parent.getAttribute('data-id');
            let url = parent.getElementsByClassName('ctrl-url')[0].value;
            url = url.trim();
            if (url) {
                let regex = /^(?:http(s)?:\/\/)/mi;
                let m;
                if ((m = regex.exec(url)) !== null) {
                    let key = btoa(url);
                    if (!oldKey || oldKey !== key) {
                        if (!popup.urlData || typeof (popup.urlData[key]) !== 'undefinded') {
                            if (!popup.urlData) {
                                popup.urlData = {};
                            }

                            let tabId = Math.random().toString(36).substr(2, 9);
                            title = tabId;
                            if (parent.getElementsByClassName('ctrl-title').length) {
                                title = parent.getElementsByClassName('ctrl-title')[0].value;
                            } else {
                                title = popup.urlData[oldKey].title;
                            }
                            popup.urlData[key] = {
                                id: tabId,
                                title: title,
                                url: url,
                                fetchUrl: '',
                                itemCount: 0,
                                issueIds: [],
                                items: {}
                            };
                            chrome.storage.local.set({ 'urlData': popup.urlData });
                            if (oldKey) {
                                popup.removeTab(oldId);
                                delete popup.urlData[oldKey];
                            }
                            let newTabId = popup.addTab(key, popup.urlData[key]);
                            $('#' + newTabId).tab('show');
                            $('.setting-btn').trigger('click');
                        } else {
                            alert('url exists!');
                        }
                    } else {
                        if (parent.getElementsByClassName('ctrl-title').length) {
                            title = parent.getElementsByClassName('ctrl-title')[0].value;
                            if (title !== popup.urlData[oldKey].title) {
                                popup.urlData[key].title = title;
                                chrome.storage.local.set({ 'urlData': popup.urlData });
                                $('#task-tab-' + popup.urlData[key].id).text(title);
                            }
                        }
                    }
                } else {
                    alert('Invalid url!');
                }
            }
        }
    };

    let watchBtn = document.getElementsByClassName('watchBtn')[0];
    watchBtn.addEventListener('click', popup.addUpdateUrl);

    $('.removeAllUrl').on('click', e => {
        for (let key in popup.urlData) {
            popup.removeTab(popup.urlData[key].id);
        }
        popup.urlData = false;
        chrome.storage.local.set({ 'urlData': popup.urlData });
        chrome.alarms.clearAll();
    });

    $('.removeAllAlarm').on('click', e => {
        chrome.alarms.clearAll();
    });

    let openTab = (href, baseUrl) => {
        console.log(href);
        if ("undefinded" !== typeof (href) && "about:blank" !== href && "javascript:;" !== href) {
            if ("http" !== href.substring(0, 4)) {
                href = baseUrl + href;
            }
        }
        chrome.tabs.create({
            url: href
        });
    }

    $('.setting-btn').on('click', e => {
        $('#content').toggleClass('show-setting');
    });
    popup.init();
}(jQuery, window, document);