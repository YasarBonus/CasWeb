// Display a message if the user has not visited the site before or the last visit was more than X days ago
// User has to confirm that they are over 18 years old to continue
const currentTimestamp = Date.now();
const initialDialog = $('#initialDialog');

checkLastVisit();

function checkLastVisit() {
    const lastVisit = localStorage.getItem('lastVisit');
    const daysSinceLastVisit = (currentTimestamp - lastVisit) / (1000 * 60 * 60 * 24);

    if (!lastVisit || daysSinceLastVisit > 7) {
        initialDialog.modal('show');
    } else {
        useFilters();
    }
}

$('#confirmAge').click(() => {
    localStorage.setItem('lastVisit', currentTimestamp);
    initialDialog.modal('hide');
    useFilters();
});