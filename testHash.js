import bcrypt from 'bcryptjs';

async function check() {
  const hash = '$2b$10$0kaQMuCh1PoohIBHCeiwAeZGS7aqrotLhYyZkyPL.ZTtF2RkFLMKy';
  
  const passwordsToTest = ['123456', 'admin123', 'hakim123', 'admin', 'hakim', '06059512qw', 'master123'];
  for (const p of passwordsToTest) {
    if (await bcrypt.compare(p, hash)) {
      console.log('PASSWORD FOUND: ', p);
      process.exit(0);
    }
  }
  console.log('Password not found in common list.');
  process.exit(0);
}
check();
