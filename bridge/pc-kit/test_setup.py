import tempfile
import unittest
from pathlib import Path
import plistlib
from setup_macos import create_jobs, write_jobs


class SetupTests(unittest.TestCase):
    def test_jobs_keep_secrets_in_private_config_and_match_source_intervals(self):
        jobs = create_jobs(Path('/kit with spaces'), Path('/private/bridge.json'), '/usr/local/bin/python3')
        self.assertEqual(jobs['com.ruoli.whatpulsebridge']['StartInterval'], 900)
        self.assertTrue(jobs['com.ruoli.musicbridge']['KeepAlive'])
        self.assertEqual(jobs['com.ruoli.musicbridge']['ProgramArguments'], ['/usr/local/bin/python3', '/kit with spaces/bridge/pc-kit/run_bridge.py', '/private/bridge.json', 'music'])
        self.assertNotIn('EnvironmentVariables', jobs['com.ruoli.musicbridge'])

    def test_write_only_own_agents_and_backup_existing_job(self):
        with tempfile.TemporaryDirectory() as tmp:
            home = Path(tmp)
            target = home / 'Library/LaunchAgents'
            target.mkdir(parents=True)
            unrelated = target / 'other.plist'
            unrelated.write_bytes(b'preserve')
            old = target / 'com.ruoli.musicbridge.plist'
            old.write_bytes(b'old')
            jobs = create_jobs(home, home / 'bridge.json', '/python')
            paths = write_jobs(jobs, home)
            self.assertEqual(unrelated.read_bytes(), b'preserve')
            self.assertTrue(list(target.glob('com.ruoli.musicbridge.plist.backup-*')))
            self.assertEqual(len(paths), 2)
            for path in paths:
                self.assertEqual(path.stat().st_mode & 0o777, 0o600)
                self.assertEqual(plistlib.loads(path.read_bytes())['Label'], path.stem)


if __name__ == '__main__':
    unittest.main()
