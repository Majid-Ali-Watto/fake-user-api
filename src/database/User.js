"use strict";
import { v4 } from "uuid";

// Seeded PRNG (mulberry32): every server instance generates the same 100 users, ids and
// passwords, so tokens and logins keep working across serverless instances and restarts.
const mulberry32 = (seed) => () => {
	seed = (seed + 0x6d2b79f5) | 0;
	let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const random = mulberry32(20240801);
const uuid = () => v4({ random: Uint8Array.from({ length: 16 }, () => Math.floor(random() * 256)) });
function generateRandomHexColor() {
	const hexCode = Math.floor(random() * 16777215).toString(16);
	return `${hexCode.padStart(6, "0")}`;
}
const SEED_PASSWORD = "password123"; // every seeded user logs in with this
// The first seeded users are fixed demo accounts, one per role.
const demoAccounts = [
	{ firstName: "Admin", lastName: "User", username: "admin", email: "admin@example.com", roles: ["admin"] },
	{ firstName: "Mod", lastName: "User", username: "moderator", email: "moderator@example.com", roles: ["moderator"] },
	{ firstName: "Regular", lastName: "User", username: "user", email: "user@example.com", roles: ["user"] }
];
const generateUsers = (users) => {
	const firstNames = ["Majid", "Ali", "Umair", "Basharat", "Salman", "Farhan", "Irfan", "Mudassir", "Safdar", "Mushtaq"];
	const lastNames = ["Muzaffar", "Mubashir", "Kaleem", "Muzammil", "Hamza", "Rehman", "Tariq", "Ajmal", "Abrar", "Akmal"];
	const domains = ["example.com", "mail.com", "webmail.com", "myemail.com", "domain.com"];
	const occupations = ["Software Developer", "Graphic Designer", "Product Manager", "Data Analyst", "Teacher", "Electrician", "Engineer", "Accountant", "Lawyer", "Doctor"];
	const companies = ["Tech Solutions Inc.", "Creative Agency", "Business Corp.", "Finance Group", "Healthcare Inc.", "Education Services", "Engineering Firm", "Legal Advisors", "Global Enterprises", "Retail Co."];
	const countries = ["United States", "Canada", "United Kingdom", "Australia", "Germany", "France", "Pakistan", "Japan", "Brazil", "South Africa"];
	const cities = ["New York", "Toronto", "London", "Sydney", "Berlin", "Paris", "Islamabad", "Tokyo", "São Paulo", "Cape Town"];
	const interestsPool = ["Coding", "Gaming", "Hiking", "Design", "Photography", "Traveling", "Reading", "Music", "Cooking", "Fitness"];
	try {
		for (let i = 1; i <= 100; i++) {
			const firstName = firstNames[Math.floor(random() * firstNames.length)];
			const lastName = lastNames[Math.floor(random() * lastNames.length)];
			const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domains[Math.floor(random() * domains.length)]}`;
			const userInterests = Array.from({ length: 3 }, () => interestsPool[Math.floor(random() * interestsPool.length)]);
			const index = Math.floor(random() * countries.length);
			users.push({
				id: uuid(),
				firstName,
				lastName,
				email,
				username: `${firstName.toLowerCase()}${lastName.toLowerCase()}`,
				password: SEED_PASSWORD,
				age: Math.floor(random() * 40) + 18,
				gender: "male",
				country: countries[index],
				city: cities[index],
				phone: `+${Math.floor(random() * 9) + 1}-${Math.floor(random() * 900) + 100}-${Math.floor(random() * 900) + 100}-${Math.floor(random() * 9000) + 1000}`,
				occupation: occupations[Math.floor(random() * occupations.length)],
				company: companies[Math.floor(random() * companies.length)],
				profilePicture: `https://placehold.jp/${generateRandomHexColor()}/${generateRandomHexColor()}/450x450.png?text=${firstName} ${lastName}`, // Using placeholder image
				bio: "Lorem ipsum dolor sit amet. " + firstName + " " + lastName,
				interests: userInterests,
				registrationDate: `202${Math.floor(random() * 4)}-${Math.floor(random() * 12) + 1}-${Math.floor(random() * 28) + 1}`,
				lastLoginDate: `2024-08-${Math.floor(random() * 28) + 1}`,
				isActive: random() > 0.5,
				roles: ["user"]
			});
		}

		demoAccounts.forEach((account, i) => Object.assign(users[i], account));
	} catch (error) {
		throw { status: 500, message: error };
	}
};
const initialObj = {
	id: null,
	firstName: null,
	lastName: null,
	email: null,
	username: null,
	password: null,
	age: null,
	gender: null,
	country: null,
	city: null,
	phone: null,
	occupation: null,
	company: null,
	profilePicture: null,
	bio: null,
	interests: null,
	registrationDate: null,
	lastLoginDate: null,
	isActive: null,
	roles: null
};
const users = [];
generateUsers(users);

const notFound = (userId) => ({ status: 404, message: `Can't find user with the id '${userId}'` });
const indexOfUser = (userId) => {
	const index = users.findIndex((user) => user.id === userId);
	if (index === -1) throw notFound(userId);
	return index;
};
// Demo accounts are shared by everyone using the API, so they can't be changed or deleted.
const indexOfWritableUser = (userId) => {
	const index = indexOfUser(userId);
	if (index < demoAccounts.length) {
		throw { status: 403, message: "Demo accounts are read-only. Create your own user or register to experiment." };
	}
	return index;
};
const timestamp = () => new Date().toLocaleString("en-US", { timeZone: "UTC" });

const getAllUsers = () => users;

const getOneUser = (userId) => users[indexOfUser(userId)];

const findUser = (userId) => users.find((user) => user.id === userId);

// Dummy auth: plain-text comparison; "login" is an email or a username.
const findUserByCredentials = ({ email, username, password }) =>
	users.find(
		(user) =>
			user.password === password &&
			(email ? user.email?.toLowerCase() === email.toLowerCase() : user.username === username)
	);

const createNewUser = (newUser) => {
	const email = newUser.email.toLowerCase();
	if (users.some((user) => user.email?.toLowerCase() === email)) {
		throw { status: 409, message: `User with the email '${newUser.email}' already exists` };
	}
	users.push({ ...initialObj, ...newUser });
	return newUser;
};

const updateOneUserPartially = (userId, changes) => {
	const index = indexOfWritableUser(userId);
	users[index] = { ...users[index], ...changes, updatedAt: timestamp() };
	return users[index];
};

const updateOneUserFully = (userId, changes) => {
	const index = indexOfWritableUser(userId);
	// roles and password are not part of the request body, so a full replace keeps them.
	const { roles, password } = users[index];
	users[index] = { ...initialObj, id: userId, roles, password, ...changes, updatedAt: timestamp() };
	return users[index];
};

const deleteOneUser = (userId) => users.splice(indexOfWritableUser(userId), 1)[0];

export { getAllUsers, createNewUser, getOneUser, findUser, findUserByCredentials, updateOneUserPartially, updateOneUserFully, deleteOneUser };
