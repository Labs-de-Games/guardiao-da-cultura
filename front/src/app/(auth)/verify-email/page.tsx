"use client";

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const getErrorMessage = () => {
    switch (error) {
      case "expired":
        return "This verification link has expired. Please request a new one.";
      case "already_used":
        return "This verification link has already been used.";
      case "wrong_device":
        return "This link was opened on a different device.";
      default:
        return "This verification link is invalid or has expired.";
    }
  };

  return (
    <Box sx={{ textAlign: "center" }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Verification Failed
      </Typography>

      <Alert severity="error" sx={{ mb: 3, textAlign: "left" }}>
        {getErrorMessage()}
      </Alert>

      <Button
        component={Link}
        href="/login"
        variant="contained"
        fullWidth
        size="large"
      >
        Go to Login
      </Button>
    </Box>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ textAlign: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
