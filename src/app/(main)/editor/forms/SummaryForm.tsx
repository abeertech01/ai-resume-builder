import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { EditorFormProps } from "@/lib/types";
import { summarySchema, SummaryValues } from "@/lib/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { debounce } from "lodash";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";

export default function SummaryForm({
  resumeData,
  setResumeData,
}: EditorFormProps) {
  const form = useForm<SummaryValues>({
    resolver: zodResolver(summarySchema),
    defaultValues: {
      summary: resumeData.summary || "",
    },
  });

  let lastValuesRef = useRef({});
  useEffect(() => {
    const debouncedValidateAndUpdate = debounce(async (values) => {
      const isSame =
        JSON.stringify(values) === JSON.stringify(lastValuesRef.current);
      if (isSame) return; // prevent re-triggering for the same values

      const isValid = await form.trigger();
      if (!isValid) return;

      lastValuesRef.current = values; // update last validated values
      setResumeData({ ...resumeData, ...values });
    }, 500);

    const subscription = form.watch((values) => {
      debouncedValidateAndUpdate(values);
    });

    return () => {
      subscription.unsubscribe();
      debouncedValidateAndUpdate.cancel();
    };
  }, [form, setResumeData]);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="space-y-1.5 text-center">
        <h2 className="text-2xl font-semibold">Professional summary</h2>
        <p className="text-muted-foreground text-sm">
          Write a short introduction for your resume or let the AI generate one
          from your entered data.
        </p>
      </div>
      <Form {...form}>
        <form className="space-y-3">
          <FormField
            control={form.control}
            name="summary"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="sr-only">Professional summary</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="A brief, engaging text about yourself"
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </form>
      </Form>
    </div>
  );
}
