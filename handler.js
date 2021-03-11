"use strict";
const axios = require("axios");

module.exports.hubspot = async (event) => {
	const snsMessage = JSON.parse(event["Records"][0].Sns.Message);

	console.log("EVENTO", JSON.stringify(event, null, 2));
	console.info("SNS Message", snsMessage);

	const type = snsMessage.notificationType;

	let ticketContent = "";
	let ticketSubject = "";

	if (type === "Bounce") {
		ticketContent = `Motivo: ${snsMessage.bounce.bounceSubType} - ${snsMessage.bounce.bouncedRecipients[0].diagnosticCode}`;
		ticketSubject = `SNS: ${type} - ${snsMessage.mail.destination[0]}`;
	} else if (type === "Complaint") {
		const feedbackType = snsMessage.complaint.complaintFeedbackType ? snsMessage.complaint.complaintFeedbackType : snsMessage.complaint.complaintSubType;
		ticketContent = `Motivo: ${feedbackType}`;
		ticketSubject = `SNS: ${type} - ${snsMessage.mail.destination[0]}`;
	}

	try {
		// get tickets
		const response = await axios.get(`https://api.hubapi.com/crm/v3/objects/tickets/?archived=false&hapikey=${process.env.HUBSPOT_API_KEY}`);
		const tickets = response.data;

		// check if ticket already exists for the provided email
		const ticketExists = tickets.results.find((ticket) => ticket.properties.subject === ticketSubject);

		if (ticketExists !== undefined) return { statusCode: 400, body: "There's already a Ticket for this email." };

		// prepare data for POST request
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

		try {
			// create ticket
			const postResponse = await axios.post(`https://api.hubapi.com/crm/v3/objects/tickets?hapikey=${process.env.HUBSPOT_API_KEY}`, data, {
				headers: {
					"Content-Type": "application/json",
				},
			});
			return {
				statusCode: 201,
				body: postResponse.data,
			};
		} catch (error) {
			console.error("Ticket creation has failed", error);
			return {
				statusCode: 400,
				message: "Ticket creation has failed",
				body: error,
			};
		}
	} catch (error) {
		console.error("Connection to Hubspot API has failed", error);
		return {
			statusCode: 400,
			message: "Connection to Hubspot API has failed",
			body: error,
		};
	}
};
