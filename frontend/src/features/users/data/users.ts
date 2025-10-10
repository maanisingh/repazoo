// DEMO/FAKE DATA DISABLED - This was using @faker-js/faker to generate dummy data
// For Repazoo, we only use real data from n8n workflows
// If you need demo data for testing, uncomment the code below

// import { faker } from '@faker-js/faker'
// faker.seed(67890)

export const users: any[] = []

// Uncomment below to enable demo/fake data for testing purposes only
/*
export const users = Array.from({ length: 500 }, () => {
  const firstName = faker.person.firstName()
  const lastName = faker.person.lastName()
  return {
    id: faker.string.uuid(),
    firstName,
    lastName,
    username: faker.internet
      .username({ firstName, lastName })
      .toLocaleLowerCase(),
    email: faker.internet.email({ firstName }).toLocaleLowerCase(),
    phoneNumber: faker.phone.number({ style: 'international' }),
    status: faker.helpers.arrayElement([
      'active',
      'inactive',
      'invited',
      'suspended',
    ]),
    role: faker.helpers.arrayElement([
      'superadmin',
      'admin',
      'cashier',
      'manager',
    ]),
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
  }
})
*/
