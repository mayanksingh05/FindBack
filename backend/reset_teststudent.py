"""Reset teststudent@college.edu to a completely clean slate (no reports, matches, claims, notifications)."""
import subprocess

def reset_test_student():
    sql = """
    DELETE FROM claims WHERE student_id IN (SELECT id FROM users WHERE email = 'teststudent@college.edu');
    DELETE FROM matches WHERE lost_report_id IN (SELECT id FROM lost_reports WHERE user_id IN (SELECT id FROM users WHERE email = 'teststudent@college.edu'));
    DELETE FROM notifications WHERE user_id IN (SELECT id FROM users WHERE email = 'teststudent@college.edu');
    DELETE FROM lost_reports WHERE user_id IN (SELECT id FROM users WHERE email = 'teststudent@college.edu');
    DELETE FROM found_reports WHERE submitted_by IN (SELECT id FROM users WHERE email = 'teststudent@college.edu');
    """
    cmd = ['docker', 'exec', 'findback_db', 'psql', '-U', 'findback_user', '-d', 'findback_db', '-c', sql]
    result = subprocess.check_output(cmd).decode()
    print(result)

if __name__ == '__main__':
    reset_test_student()
