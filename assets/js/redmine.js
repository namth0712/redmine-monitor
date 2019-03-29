(() => {
    openPopup = (e) => {
        e.preventDefault();
        if ($('#iss-quickview').length) {
            $('#iss-quickview').remove();
        }
        let url = $(e.target).attr('href');
        let popup = $(`<div class="issue-quickview white-popup" id="iss-quickview">${content}</div>`);
        $('body').append(popup);
        popup.load(`${url} #content`, function (response, status, xhr) {
            popup.find('#content').attr('id', 'content-issue');
            popup.find('.next-prev-links > a').on('click', openPopup);
            $.magnificPopup.open({
                items: {
                    src: popup,
                    type: 'inline'
                },
                closeBtnInside: true
            });
        });
    }

    $('tr.issue').each(function (index) {
        let issue = $(this);
        issue.find('.id > a').on('click', openPopup);
        issue.find('.subject > a').on('click', openPopup);
    })
})();