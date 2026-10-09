"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FormProvider,
  useForm,
  useFormContext,
  useWatch,
  type FieldError,
  type Resolver,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Send } from "lucide-react";
import {
  buildRegistrationSchema,
  NIGERIAN_STATES,
  type RegistrationRequirements,
} from "@/lib/validation/registration";
import { calculateAge } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea, Checkbox } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";

interface RegistrationFormValues {
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: string;
  gender: "MALE" | "FEMALE" | "PREFER_NOT_TO_SAY";
  phone: string;
  email?: string;
  address?: string;
  state: string;
  town: string;
  churchAssemblyId?: string;
  pastorName?: string;
  pastorPhone?: string;
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactPhone: string;
  participantCategory: string;
  tShirtSize?: string;
  dietaryRequirements?: string;
  assistanceRequirements?: string;
  additionalInformation?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianConsent: boolean;
  accuracyConsent: boolean;
  termsAccepted: boolean;
  privacyAcknowledged: boolean;
  idempotencyKey: string;
}

interface RegistrationFormProps {
  assemblies: { id: string; name: string; branch: string | null }[];
  categories: string[];
  tShirtSizes: string[];
  requirements: RegistrationRequirements;
  registrationOpen: boolean;
  privacyNotice?: string | null;
  terms?: string | null;
}

function errorText(error: FieldError | undefined): string | undefined {
  return error?.message;
}

function FormText({
  name,
  label,
  required,
  error,
  hint,
  type = "text",
  placeholder,
  autoComplete,
}: {
  name: keyof RegistrationFormValues;
  label: string;
  required?: boolean;
  error?: FieldError;
  hint?: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
}) {
  const { register } = useFormContext<RegistrationFormValues>();
  const id = `field-${String(name)}`;
  return (
    <Field label={label} htmlFor={id} required={required} error={errorText(error)} hint={hint}>
      <Input
        id={id}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        {...register(name)}
      />
    </Field>
  );
}

function FormTextarea({
  name,
  label,
  required,
  error,
  hint,
  placeholder,
}: {
  name: keyof RegistrationFormValues;
  label: string;
  required?: boolean;
  error?: FieldError;
  hint?: string;
  placeholder?: string;
}) {
  const { register } = useFormContext<RegistrationFormValues>();
  const id = `field-${String(name)}`;
  return (
    <Field label={label} htmlFor={id} required={required} error={errorText(error)} hint={hint}>
      <Textarea
        id={id}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        {...register(name)}
      />
    </Field>
  );
}

function FormSelect({
  name,
  label,
  required,
  error,
  hint,
  options,
  placeholder = "Select…",
}: {
  name: keyof RegistrationFormValues;
  label: string;
  required?: boolean;
  error?: FieldError;
  hint?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  const { register } = useFormContext<RegistrationFormValues>();
  const id = `field-${String(name)}`;
  return (
    <Field label={label} htmlFor={id} required={required} error={errorText(error)} hint={hint}>
      <Select
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        {...register(name)}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </Field>
  );
}

function FormCheckbox({
  name,
  label,
  error,
}: {
  name: keyof RegistrationFormValues;
  label: React.ReactNode;
  error?: FieldError;
}) {
  const { register } = useFormContext<RegistrationFormValues>();
  const id = `field-${String(name)}`;
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="flex items-start gap-3 text-sm text-slate-700">
        <Checkbox id={id} aria-invalid={Boolean(error)} {...register(name)} />
        <span>{label}</span>
      </label>
      {error ? (
        <p role="alert" className="pl-7 text-xs font-medium text-red-600">
          {errorText(error)}
        </p>
      ) : null}
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold text-brand-950">{title}</h2>
      {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

export function RegistrationForm({
  assemblies,
  categories,
  tShirtSizes,
  requirements,
  registrationOpen,
  privacyNotice,
  terms,
}: RegistrationFormProps) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const schema = useMemo(() => buildRegistrationSchema(requirements), [requirements]);
  const resolvedCategories = categories.length ? categories : ["Youth", "Teenager", "Other"];

  const methods = useForm<RegistrationFormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<RegistrationFormValues>,
    mode: "onBlur",
    defaultValues: {
      firstName: "",
      middleName: "",
      lastName: "",
      dateOfBirth: "",
      gender: "PREFER_NOT_TO_SAY",
      phone: "",
      email: "",
      address: "",
      state: "",
      town: "",
      churchAssemblyId: "",
      pastorName: "",
      pastorPhone: "",
      emergencyContactName: "",
      emergencyContactRelationship: "",
      emergencyContactPhone: "",
      participantCategory: "",
      tShirtSize: "",
      dietaryRequirements: "",
      assistanceRequirements: "",
      additionalInformation: "",
      guardianName: "",
      guardianPhone: "",
      guardianConsent: false,
      accuracyConsent: false,
      termsAccepted: false,
      privacyAcknowledged: false,
      idempotencyKey: "",
    },
  });

  const {
    handleSubmit,
    control,
    register,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = methods;

  useEffect(() => {
    setValue("idempotencyKey", crypto.randomUUID());
  }, [setValue]);

  const dob = useWatch({ control, name: "dateOfBirth" });
  const isMinor = useMemo(() => {
    if (!dob || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) return false;
    const date = new Date(`${dob}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) return false;
    return calculateAge(date) < 18;
  }, [dob]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    if (!values.idempotencyKey) {
      values.idempotencyKey = crypto.randomUUID();
    }
    try {
      const response = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = (await response.json().catch(() => ({}))) as {
        message?: string;
        token?: string;
        fieldErrors?: Record<string, string>;
      };

      if (!response.ok) {
        if (data.fieldErrors) {
          for (const [key, message] of Object.entries(data.fieldErrors)) {
            setError(key as keyof RegistrationFormValues, { type: "server", message });
          }
        }
        setFormError(data.message ?? "We could not complete your registration. Please try again.");
        return;
      }

      router.push(`/register/success?t=${encodeURIComponent(data.token ?? "")}`);
    } catch {
      setFormError(
        "Network error. Please check your connection and try again. Your details were not submitted.",
      );
    }
  });

  if (!registrationOpen) {
    return (
      <Alert tone="warning" title="Registration is closed">
        Registration for the Youth Camp Programme is currently closed. Please contact the camp
        office for assistance.
      </Alert>
    );
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={onSubmit} noValidate className="space-y-6">
        {formError ? (
          <Alert tone="error" title="Registration not completed">
            <p>{formError}</p>
          </Alert>
        ) : null}

        <SectionCard title="Personal Information" description="Tell us about the participant.">
          <div className="grid gap-4 sm:grid-cols-3">
            <FormText name="firstName" label="First name" required error={errors.firstName} autoComplete="given-name" />
            <FormText name="middleName" label="Middle name" error={errors.middleName} autoComplete="additional-name" />
            <FormText name="lastName" label="Last name" required error={errors.lastName} autoComplete="family-name" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormText name="dateOfBirth" label="Date of birth" type="date" required error={errors.dateOfBirth} />
            <FormSelect
              name="gender"
              label="Gender"
              error={errors.gender}
              options={[
                { value: "MALE", label: "Male" },
                { value: "FEMALE", label: "Female" },
                { value: "PREFER_NOT_TO_SAY", label: "Prefer not to say" },
              ]}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormText
              name="phone"
              label="Phone number"
              required
              type="tel"
              placeholder="08012345678"
              error={errors.phone}
              autoComplete="tel"
            />
            <FormText
              name="email"
              label="Email address"
              type="email"
              required={requirements.requireEmail}
              placeholder="optional"
              error={errors.email}
              autoComplete="email"
              hint="Email is optional if you do not have one."
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormSelect
              name="state"
              label="State of residence"
              required
              error={errors.state}
              options={NIGERIAN_STATES.map((state) => ({ value: state, label: state }))}
            />
            <FormText name="town" label="Town / area" required error={errors.town} />
          </div>
          <FormTextarea name="address" label="Home address" required={requirements.requireAddress} error={errors.address} />
        </SectionCard>

        <SectionCard title="Church Information" description="Your local assembly and fellowship leader.">
          <div className="grid gap-4 sm:grid-cols-2">
            {assemblies.length > 0 ? (
              <FormSelect
                name="churchAssemblyId"
                label="Local church / assembly"
                required={requirements.requireChurchAssembly}
                error={errors.churchAssemblyId}
                options={assemblies.map((assembly) => ({
                  value: assembly.id,
                  label: assembly.branch ? `${assembly.name} (${assembly.branch})` : assembly.name,
                }))}
              />
            ) : (
              <Alert tone="neutral">
                Church assemblies have not been configured yet. You can leave this blank.
              </Alert>
            )}
            <FormText
              name="pastorName"
              label="Pastor / fellowship leader"
              required={requirements.requirePastorName}
              error={errors.pastorName}
            />
          </div>
          <FormText
            name="pastorPhone"
            label="Pastor / fellowship leader phone"
            type="tel"
            required={requirements.requirePastorPhone}
            error={errors.pastorPhone}
          />
        </SectionCard>

        <SectionCard title="Emergency Contact" description="Someone we can reach in an emergency.">
          <div className="grid gap-4 sm:grid-cols-3">
            <FormText name="emergencyContactName" label="Full name" required error={errors.emergencyContactName} />
            <FormText
              name="emergencyContactRelationship"
              label="Relationship"
              required
              placeholder="e.g. Parent, Sibling"
              error={errors.emergencyContactRelationship}
            />
            <FormText
              name="emergencyContactPhone"
              label="Phone number"
              type="tel"
              required
              error={errors.emergencyContactPhone}
            />
          </div>
        </SectionCard>

        <SectionCard title="Camp Information" description="Help us plan for your stay.">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormSelect
              name="participantCategory"
              label="Participant category"
              required={requirements.requireCategory}
              error={errors.participantCategory}
              options={resolvedCategories.map((category) => ({ value: category, label: category }))}
            />
            <FormSelect
              name="tShirtSize"
              label="T-shirt size"
              required={requirements.requireTShirt}
              error={errors.tShirtSize}
              options={tShirtSizes.map((size) => ({ value: size, label: size }))}
            />
          </div>
          <FormTextarea
            name="dietaryRequirements"
            label="Food allergies or dietary requirements"
            error={errors.dietaryRequirements}
            hint="Shared only with the camp kitchen team."
          />
          <FormTextarea
            name="assistanceRequirements"
            label="Accessibility or special assistance"
            error={errors.assistanceRequirements}
            hint="Shared only with authorised camp staff who need it."
          />
          <FormTextarea name="additionalInformation" label="Additional information" error={errors.additionalInformation} />
        </SectionCard>

        {isMinor ? (
          <SectionCard
            title="Parent / Guardian Information"
            description="Required because the participant is under 18."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormText name="guardianName" label="Parent / guardian full name" required error={errors.guardianName} />
              <FormText
                name="guardianPhone"
                label="Parent / guardian phone"
                type="tel"
                required
                error={errors.guardianPhone}
              />
            </div>
            <FormCheckbox
              name="guardianConsent"
              error={errors.guardianConsent}
              label="I am the parent or legal guardian and I give consent for this participant to attend the camp."
            />
          </SectionCard>
        ) : null}

        <SectionCard title="Consent & Submission" description="Please read and confirm the following.">
          <FormCheckbox
            name="accuracyConsent"
            error={errors.accuracyConsent}
            label="I confirm that the information provided in this form is accurate and complete."
          />
          <FormCheckbox
            name="termsAccepted"
            error={errors.termsAccepted}
            label={terms ? `I agree to the camp's registration terms.` : "I agree to the camp's registration terms."}
          />
          {terms ? (
            <details className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              <summary className="cursor-pointer font-medium text-slate-700">Read registration terms</summary>
              <p className="mt-2 whitespace-pre-line">{terms}</p>
            </details>
          ) : null}
          <FormCheckbox
            name="privacyAcknowledged"
            error={errors.privacyAcknowledged}
            label="I have read and understood how registration information will be used."
          />
          <details className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            <summary className="cursor-pointer font-medium text-slate-700">Read privacy notice</summary>
            <p className="mt-2 whitespace-pre-line">
              {privacyNotice ||
                "Registration information is collected solely to organise the camp, care for participants, and contact guardians in an emergency. It is stored securely, shared only with authorised camp staff, and handled in line with the Nigeria Data Protection Act 2023. You may request correction or deletion of your data by contacting the camp office."}
            </p>
          </details>

          <input type="hidden" {...register("idempotencyKey")} />

          <div className="pt-2">
            <Button type="submit" size="lg" disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="h-4 w-4" aria-hidden="true" />
              )}
              {isSubmitting ? "Submitting…" : "Complete Registration"}
            </Button>
          </div>
        </SectionCard>
      </form>
    </FormProvider>
  );
}
