export const tools = [
    {
        type: "function",
        function: {
            name: "draft_email",
            description: "Draft an email to a recipient.",
            parameters: {
                type: "object",
                properties: {
                    to: { type: "string", description: "The recipient email address" },
                    subject: { type: "string", description: "The email subject" },
                    body: { type: "string", description: "The email body content" }
                },
                required: ["to", "subject", "body"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "create_ticket",
            description: "Create a Jira ticket.",
            parameters: {
                type: "object",
                properties: {
                    title: { type: "string", description: "Ticket title" },
                    description: { type: "string", description: "Ticket description" },
                    priority: {
                        type: "string",
                        enum: ["low", "medium", "high", "critical"],
                        description: "Priority level"
                    }
                },
                required: ["title", "description", "priority"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "extract_action_items",
            description: "Extract action items from a meeting transcript or text.",
            parameters: {
                type: "object",
                properties: {
                    items: {
                        type: "array",
                        items: { type: "string" },
                        description: "List of action items"
                    }
                },
                required: ["items"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "generate_report",
            description: "Generate a structured report with sections.",
            parameters: {
                type: "object",
                properties: {
                    title: { type: "string", description: "Report title" },
                    sections: {
                        type: "array",
                        items: { type: "string" },
                        description: "Report sections"
                    }
                },
                required: ["title", "sections"]
            }
        }
    }
];
