import PeopleList from '../components/PeopleList'

export const StaffPage = () => <PeopleList role="staff" basePath="/staff" />
export const InternsPage = () => <PeopleList role="intern" basePath="/interns" />
export const LecturersPage = () => <PeopleList role="lecturer" basePath="/lecturers" />
