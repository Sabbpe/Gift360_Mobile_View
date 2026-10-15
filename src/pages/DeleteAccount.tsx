import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

const DeleteAccount = () => {

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link href="/">
          <button className="mb-6 flex items-center gap-2 border px-4 py-2 rounded-md">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </button>
        </Link>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-6">Delete Your Gift360 Account</h1>

          <div className="prose max-w-none space-y-6">
            <p className="text-gray-700 leading-relaxed">
              To request deletion of your Gift360 account and associated data, please email{" "}
              <a href="mailto:gift360@gift360.io" className="font-semibold text-[#7C3AED] underline">
                <strong>gift360@gift360.io</strong>
              </a>{" "}
              using your registered email address.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Our support team will assist you with the account deletion process.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteAccount;
