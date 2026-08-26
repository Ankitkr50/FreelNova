const bcrypt = require("bcryptjs");
const { prisma } = require("../src/config/db");

async function seedUsers() {
  console.log("Seeding initial users to active Neon database...");
  const hashedPassword = await bcrypt.hash("Ankitkr@829301", 10);

  const usersData = [
    {
      id: "a852294c-db29-42f6-a30a-88ff3acd93fb",
      name: "FreelNova Admin",
      email: "fn.freelnova@gmail.com",
      username: "admin_freelnova",
      userCode: "AID00000001",
      password: hashedPassword,
      role: "admin",
      adminRole: "SUPER_ADMIN",
      isEmailVerified: true,
      profileCompleted: true,
      isVerified: true,
    },
    {
      id: "0c7ce6b4-1ad7-424c-8b66-0d51f66f5963",
      name: "Ankit Kumar",
      email: "ankitkumar829301@gmail.com",
      username: "ankit01",
      userCode: "FID00000004",
      password: hashedPassword,
      role: "freelancer",
      category: "student",
      isEmailVerified: true,
      profileCompleted: true,
      isVerified: true,
      phone: "7004937544",
      schoolOrCollege: "LPU",
      schoolResult: "8.04",
      aadhaarCard: "466566656565",
      panCard: "LUEPK7674H",
      bankAccountNo: "654654654544",
      bankIfsc: "SBIN0012345",
      bankName: "SBI",
      upiId: "ankit@ylb",
    },
    {
      id: "cb8afc62-8237-444f-91ec-cc087981fe04",
      name: "Somil Raj",
      email: "somilraj55@gmail.com",
      username: "FID00000003",
      userCode: "FID00000003",
      password: hashedPassword,
      role: "freelancer",
      isEmailVerified: true,
      profileCompleted: false,
      isVerified: false,
    },
    {
      id: "d70c2163-810e-4364-92a8-a5d80f021f7b",
      name: "Ashish Kumar",
      email: "ashishkumar@gmail.com",
      username: "FID00000002",
      userCode: "FID00000002",
      password: hashedPassword,
      role: "freelancer",
      isEmailVerified: true,
      profileCompleted: false,
      isVerified: false,
    },
    {
      id: "433d24a7-338d-4c32-9bb7-9c54983efaac",
      name: "Raj Somil",
      email: "rajsomil@gmail.com",
      username: "FID00000001",
      userCode: "FID00000001",
      password: hashedPassword,
      role: "freelancer",
      isEmailVerified: true,
      profileCompleted: false,
      isVerified: false,
    },
  ];

  for (const u of usersData) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        username: u.username,
        userCode: u.userCode,
        role: u.role,
        isEmailVerified: u.isEmailVerified,
        profileCompleted: u.profileCompleted,
        isVerified: u.isVerified,
      },
      create: u,
    });
    console.log(`✓ Seeded user: ${u.name} (${u.email}) [${u.userCode}]`);
  }

  const count = await prisma.user.count();
  console.log(`\n🎉 Total users in database: ${count}`);
}

seedUsers()
  .catch((err) => console.error("Error seeding users:", err))
  .finally(() => process.exit(0));
