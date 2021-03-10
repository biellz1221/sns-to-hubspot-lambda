"use strict";
const axios = require("axios");

module.exports.hubspot = async (event) => {
	console.info("TESTANDO", "TESTE");
	console.log("EVENTO", JSON.stringify(event, null, 2));

	const type = event.notificationType;
	if (type !== "Bounce") return { statusCode: 200 };

	const ticketContent = `Motivo: ${event.bounce.bouncedRecipients[0].diagnosticCode}`;
	const ticketSubject = `SNS: ${type} - ${event.mail.destination[0]}`;

	// ticket by id
	//const response = await axios.get(`https://api.hubapi.com/crm/v3/objects/tickets/329307198?hapikey=${process.env.HUBSPOT_API_KEY}`);

	// get tickets
	const response = await axios.get(`https://api.hubapi.com/crm/v3/objects/tickets/?archived=false&hapikey=${process.env.HUBSPOT_API_KEY}`);
	const tickets = response.data;
	const ticketExists = tickets.results.find((ticket) => ticket.properties.subject === ticketSubject);

	if (ticketExists !== undefined) return { statusCode: 200, body: "Já existe um ticket para este e-mail" };

	const data = JSON.stringify({
		"properties": {
			"content": ticketContent,
			"hs_pipeline": "0",
			"hs_pipeline_stage": "1",
			"hs_ticket_priority": "MEDIUM",
			"hubspot_owner_id": process.env.TICKET_OWNER_ID.toString(),
			"subject": ticketSubject,
		},
	});

	// create ticket
	const postResponse = await axios.post(`https://api.hubapi.com/crm/v3/objects/tickets?hapikey=${process.env.HUBSPOT_API_KEY}`, data, {
		headers: {
			"Content-Type": "application/json",
		},
	});

	return {
		statusCode: 200,
		body: postResponse.data,
	};
};
