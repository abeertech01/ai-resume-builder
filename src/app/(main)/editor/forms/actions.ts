"use server";

import { env } from "@/env";
import { canUseAITools } from "@/lib/permissions";
import { getUserSubscriptionLevel } from "@/lib/subscriptions";
import {
  GenerateSummaryInput,
  generateSummarySchema,
  GenerateWorkExperienceInput,
  generateWorkExperienceSchema,
  WorkExperience,
} from "@/lib/validation";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function generateSummary(input: GenerateSummaryInput) {
  const GEN_API = env.GEMINI_API_KEY;

  if (!GEN_API) throw new Error("Gemini API key not found");

  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized!!");
  }

  const subscriptionLevel = await getUserSubscriptionLevel(userId);

  if (!canUseAITools(subscriptionLevel)) {
    throw new Error("Upgrade your subscription to use this feature.");
  }

  const { jobTitle, workExperiences, educations, skills } =
    generateSummarySchema.parse(input);

  const systemMessage = `
  You are a job resume generator AI. Your task is to write a professional introduction summary for a resume given the user's provided data. Only return the summary and do not include any other information in the response. Keep it concise and professional.
  `;

  const userMessage = `
  Please generate a professional resume summary from this data:
  
  Job Title: ${jobTitle || "N/A"}

  Work experience:
  ${workExperiences
    ?.map(
      (exp) => `
    Position: ${exp.position || "N/A"} at ${exp.company || "N/A"} from ${exp.startDate || "N/A"} to ${exp.endDate || "Present"}
    
    Description:
    ${exp.description || "N/A"}
    `,
    )
    .join("\n\n")}

    Education:
  ${educations
    ?.map(
      (edu) => `
    Degree: ${edu.degree || "N/A"} at ${edu.school || "N/A"} from ${edu.startDate || "N/A"} to ${edu.endDate || "N/A"}
    `,
    )
    .join("\n\n")}

    Skills:
    ${skills}
  `;

  console.log("systemMessage", systemMessage);
  console.log("userMessage", userMessage);

  try {
    const genAI = new GoogleGenerativeAI(GEN_API);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: systemMessage,
    });

    const result = await model.generateContent(userMessage);
    const response = result.response;
    const summary = response.text();

    console.log("Summary: ", summary);
    return summary;
  } catch (error) {
    console.error("Error generating summary:", error);
    // You might want to handle specific errors here, e.g., rate limits, invalid input
    throw new Error("Failed to generate resume summary.");
  }
}

export async function generateWorkExperience(
  input: GenerateWorkExperienceInput,
) {
  const GEN_API = env.GEMINI_API_KEY;

  if (!GEN_API) throw new Error("Gemini API key not found");

  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized!!");
  }

  const subscriptionLevel = await getUserSubscriptionLevel(userId);

  if (!canUseAITools(subscriptionLevel)) {
    throw new Error("Upgrade your subscription to use this feature.");
  }

  const { description } = generateWorkExperienceSchema.parse(input);

  const systemMessage = `
  You are a job resume generator AI. Your task is to generate a single work experience entry based on the user input. Your response must adhere to the following structure. You can omit fields if they can't be inferred from the provided data, but don't add any new ones.

  Job title: <job title>
  Company: <company name>
  Start date: <format: YYYY-MM-DD> (only if provided)
  End date: <format: YYYY-MM-DD> (only if provided)
  Description: <an optimized description in bullet format (use • sign for bullet points), might be inferred from the job title>
  `;

  const userMessage = `
  Please provide a work experience entry from this description:
  ${description}
  `;

  try {
    const genAI = new GoogleGenerativeAI(GEN_API);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: systemMessage,
    });

    const result = await model.generateContent(userMessage);
    const response = result.response;
    const responseText = response.text();

    console.log("responseText", responseText);

    return {
      position: responseText.match(/Job title: (.*)/)?.[1] || "",
      company: responseText.match(/Company: (.*)/)?.[1] || "",
      description: (responseText.match(/Description:([\s\S]*)/)?.[1] || "")
        .split("\n")
        .map((line) => line.trimStart())
        .join("\n")
        .trim(),
      startDate: responseText.match(/Start date: (\d{4}-\d{2}-\d{2})/)?.[1],
      endDate: responseText.match(/End date: (\d{4}-\d{2}-\d{2})/)?.[1],
    } satisfies WorkExperience;
  } catch (error) {
    console.error("Error generating summary:", error);
    // You might want to handle specific errors here, e.g., rate limits, invalid input
    throw new Error("Failed to generate resume summary.");
  }
}
