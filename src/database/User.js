const users = [];
import { v4 } from "uuid";
const uuid = v4;
function generateRandomHexColor() {
	const hexCode = Math.floor(Math.random() * 16777215).toString(16);
	return `${hexCode.padStart(6, "0")}`;
}
const generateUsers = (count) => {
	const firstNames = ["Majid", "Ali", "Umair", "Basharat", "Salman", "Farhan", "Irfan", "Mudassir", "Safdar", "Mushtaq"];
	const lastNames = ["Muzaffar", "Mubashir", "Kaleem", "Muzammil", "Hamza", "Rehman", "Tariq", "Ajmal", "Abrar", "Akmal"];
	const domains = ["example.com", "mail.com", "webmail.com", "myemail.com", "domain.com"];
	const occupations = ["Software Developer", "Graphic Designer", "Product Manager", "Data Analyst", "Teacher", "Electrician", "Engineer", "Accountant", "Lawyer", "Doctor"];
	const companies = ["Tech Solutions Inc.", "Creative Agency", "Business Corp.", "Finance Group", "Healthcare Inc.", "Education Services", "Engineering Firm", "Legal Advisors", "Global Enterprises", "Retail Co."];
	const countries = ["United States", "Canada", "United Kingdom", "Australia", "Germany", "France", "Pakistan", "Japan", "Brazil", "South Africa"];
	const cities = ["New York", "Toronto", "London", "Sydney", "Berlin", "Paris", "Islamabad", "Tokyo", "São Paulo", "Cape Town"];
	const interestsPool = ["Coding", "Gaming", "Hiking", "Design", "Photography", "Traveling", "Reading", "Music", "Cooking", "Fitness"];

	for (let i = 1; i <= count; i++) {
		const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
		const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
		const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domains[Math.floor(Math.random() * domains.length)]}`;
		const userInterests = Array.from({ length: 3 }, () => interestsPool[Math.floor(Math.random() * interestsPool.length)]);
		const index = Math.floor(Math.random() * countries.length);
		users.push({
			id: uuid(),
			firstName,
			lastName,
			email,
			username: `${firstName.toLowerCase()}${lastName.toLowerCase()}`,
			password: `password${Math.floor(Math.random() * 1000)}`,
			age: Math.floor(Math.random() * 40) + 18,
			gender: "Male", //Math.random() > 0.5 ? "Male" : "Female",
			country: countries[index],
			city: cities[index],
			phone: `+${Math.floor(Math.random() * 9) + 1}-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
			occupation: occupations[Math.floor(Math.random() * occupations.length)],
			company: companies[Math.floor(Math.random() * companies.length)],
			profilePicture: `https://placehold.jp/${generateRandomHexColor()}/${generateRandomHexColor()}/450x450.png?text=${firstName} ${lastName}`, // Using placeholder image
			bio: "Lorem ipsum dolor sit amet. " + firstName + " " + lastName,
			interests: userInterests,
			registrationDate: `202${Math.floor(Math.random() * 4)}-${Math.floor(Math.random() * 12) + 1}-${Math.floor(Math.random() * 28) + 1}`,
			lastLoginDate: `2024-08-${Math.floor(Math.random() * 28) + 1}`,
			isActive: Math.random() > 0.5,
			roles: ["User"]
		});
	}

	return users;
};
const saveToDatabase = (user) => {
	users.push(user);
};
const getOneUser = (userId) => {
	const user = users.find((user) => user.id === userId);
	if (!user) {
		return;
	}
	return user;
};

const createNewUser = (newUser) => {
	const isAlreadyAdded = users.findIndex((user) => user.firstName + user.lastName === newUser.firstName + newUser.lastName) > -1;
	if (isAlreadyAdded) {
		return;
	}
	const user = {
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
	saveToDatabase({ ...user, ...newUser });
	return newUser;
};

const updateOneUser = (userId, changes) => {
	const indexForUpdate = users.findIndex((user) => user.id === userId);
	if (indexForUpdate === -1) {
		return;
	}
	const updatedUser = {
		...users[indexForUpdate],
		...changes,
		updatedAt: new Date().toLocaleString("en-US", { timeZone: "UTC" })
	};
	users[indexForUpdate] = updatedUser;
	// saveToDatabase(users);
	return updatedUser;
};

const deleteOneUser = (userId) => {
	const indexForDeletion = users.findIndex((user) => user.id === userId);
	if (indexForDeletion === -1) {
		return;
	}
	users.splice(indexForDeletion, 1);
	// saveToDatabase(users);
};

export { generateUsers, createNewUser, getOneUser, updateOneUser, deleteOneUser };
